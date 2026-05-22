import { getThreatStats, getIncidents, createIncident, updateIncident, authApi, getUsers, getIncidentById, deleteIncident, getStats, getMostFrequent, } from "./apiClient";
import { renderThreatStats, renderListStatus, renderTable, renderPagination, setFormEnabled, clearFieldErrors, showFieldError, showNotice, showApiError, renderEndpointResult, renderStats, renderUsers, } from "./ui";
import { cacheGet, cacheSet, invalidateAll } from "./cache";
import { toListItemViewModel } from "./dtos";
const state = {
    page: 1,
    pageSize: 5,
    tag: "",
    criticality: "",
    description: "",
    sortBy: "",
    sortDir: "asc",
};
let isLoginMode = true;
let editId = null;
let activeLoadController = null;
async function loadList(bustCache = false) {
    if (activeLoadController)
        activeLoadController.abort();
    activeLoadController = new AbortController();
    const signal = activeLoadController.signal;
    const params = {
        page: String(state.page),
        pageSize: String(state.pageSize),
    };
    if (state.tag)
        params.tag = state.tag;
    if (state.criticality)
        params.criticality = state.criticality;
    if (state.description)
        params.description = state.description;
    if (state.sortBy)
        params.sortBy = state.sortBy;
    if (state.sortBy)
        params.sortDir = state.sortDir;
    const cacheKey = new URLSearchParams(params).toString();
    if (!bustCache) {
        const cached = cacheGet(cacheKey);
        if (cached) {
            renderTable(cached.items.map(toListItemViewModel));
            renderPagination(cached.meta, state.page, goToPage);
            renderListStatus("success");
            showCacheLabel(true);
            return;
        }
    }
    showCacheLabel(false);
    renderListStatus("loading");
    try {
        const data = await getIncidents(params, signal);
        cacheSet(cacheKey, data);
        if (!data.items || data.items.length === 0) {
            renderTable([]);
            renderPagination(null, 1, goToPage);
            renderListStatus("empty");
            return;
        }
        renderTable(data.items.map(toListItemViewModel));
        renderPagination(data.meta, state.page, goToPage);
        renderListStatus("success");
    }
    catch (err) {
        const apiErr = err;
        if (apiErr.code !== "ABORTED") {
            renderTable([]);
            renderPagination(null, 1, goToPage);
            renderListStatus("error", apiErr);
        }
    }
}
async function loadUsers() {
    try {
        const result = await getUsers();
        renderUsers(result.data);
    }
    catch (err) {
        showApiError(err);
    }
}
function goToPage(page) {
    state.page = page;
    loadList();
}
function checkAuth() {
    const token = localStorage.getItem("jwt_token");
    const userName = localStorage.getItem("user_name");
    const authSection = document.getElementById("authSection");
    const appContent = document.getElementById("appContent");
    const logoutBtn = document.getElementById("logoutBtn");
    const currentUserDisplay = document.getElementById("currentUserDisplay");
    if (authSection) {
        authSection.style.display = token ? "none" : "flex";
    }
    if (appContent) {
        appContent.style.display = token ? "flex" : "none";
    }
    if (logoutBtn) {
        logoutBtn.style.display = token ? "inline-flex" : "none";
    }
    if (currentUserDisplay) {
        currentUserDisplay.textContent = token && userName ? `Користувач: ${userName}` : "";
    }
    if (token) {
        loadList();
        loadUsers();
    }
}
function showCacheLabel(fromCache) {
    const el = document.getElementById("cacheLabel");
    if (el)
        el.textContent = fromCache ? "⚡ з кешу" : "";
}
document.getElementById("authForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("authName");
    const passInput = document.getElementById("authPassword");
    const name = nameInput ? nameInput.value : "";
    const pass = passInput ? passInput.value : "";
    try {
        if (isLoginMode) {
            await authApi.login(name, pass);
            showNotice("Вітаємо у системі!");
        }
        else {
            await authApi.register(name, pass);
            showNotice("Аккаунт створено. Тепер увійдіть.");
            isLoginMode = true;
            document.getElementById("toggleMode")?.click();
            return;
        }
        checkAuth();
    }
    catch (err) {
        showNotice(err.message || "Помилка автентифікації", true);
    }
});
document.getElementById("toggleMode")?.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    const title = document.getElementById("authTitle");
    const btn = document.getElementById("authBtn");
    if (title)
        title.textContent = isLoginMode ? "Вхід у систему" : "Реєстрація";
    if (btn)
        btn.textContent = isLoginMode ? "Увійти" : "Створити аккаунт";
});
document.getElementById("logoutBtn")?.addEventListener("click", () => {
    authApi.logout();
});
window.addEventListener("auth_failed", () => checkAuth());
document.getElementById("filterTag")?.addEventListener("change", (e) => {
    state.tag = e.target.value;
    state.page = 1;
    loadList();
});
document.getElementById("filterCriticality")?.addEventListener("change", (e) => {
    state.criticality = e.target.value;
    state.page = 1;
    loadList();
});
document.getElementById("filterDescription")?.addEventListener("input", (e) => {
    state.description = e.target.value.trim();
    state.page = 1;
    loadList();
});
document.getElementById("filterPageSize")?.addEventListener("change", (e) => {
    state.pageSize = Number(e.target.value);
    state.page = 1;
    loadList();
});
document.getElementById("clearFilters")?.addEventListener("click", () => {
    state.tag = "";
    state.criticality = "";
    state.description = "";
    state.page = 1;
    const tagEl = document.getElementById("filterTag");
    const critEl = document.getElementById("filterCriticality");
    const descEl = document.getElementById("filterDescription");
    if (tagEl)
        tagEl.value = "";
    if (critEl)
        critEl.value = "";
    if (descEl)
        descEl.value = "";
    loadList();
});
document.querySelectorAll("th[data-field]").forEach((th) => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
        const field = th.dataset.field;
        if (state.sortBy === field) {
            state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        }
        else {
            state.sortBy = field;
            state.sortDir = "asc";
        }
        state.page = 1;
        document.querySelectorAll("th[data-field] span").forEach((s) => (s.textContent = "⬍"));
        const span = th.querySelector("span");
        if (span)
            span.textContent = state.sortDir === "asc" ? "↑" : "↓";
        loadList();
    });
});
const createForm = document.getElementById("createForm");
createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm())
        return;
    const dto = readFormDto();
    setFormEnabled(false);
    clearFieldErrors();
    try {
        if (editId) {
            await updateIncident(editId, dto);
            showNotice("Інцидент оновлено");
            editId = null;
        }
        else {
            await createIncident(dto);
            showNotice("Інцидент додано");
        }
        invalidateAll();
        createForm.reset();
        state.page = 1;
        await loadList(true);
    }
    catch (err) {
        const apiErr = err;
        showApiError(apiErr);
        if (Array.isArray(apiErr.details)) {
            apiErr.details.forEach((msg) => {
                if (msg.includes("Date"))
                    showFieldError("dateError", msg);
                else if (msg.includes("Reporter"))
                    showFieldError("reporterError", msg);
                else if (msg.includes("Comment"))
                    showFieldError("commentError", msg);
                else if (msg.includes("criticality"))
                    showFieldError("criticalityError", msg);
                else if (msg.includes("tag"))
                    showFieldError("tagError", msg);
            });
        }
    }
    finally {
        setFormEnabled(true);
    }
});
const tableBody = document.getElementById("itemsTableBody");
tableBody?.addEventListener("click", async (e) => {
    const target = e.target.closest("button");
    if (!target)
        return;
    const id = target.dataset.id;
    if (!id)
        return;
    if (target.classList.contains("viewBtn")) {
        try {
            const item = await getIncidentById(id);
            renderEndpointResult(item);
            showNotice("Incident loaded by id");
        }
        catch (err) {
            showApiError(err);
        }
        return;
    }
    if (target.classList.contains("deleteIncidentBtn")) {
        if (!confirm("Delete this incident?"))
            return;
        try {
            await deleteIncident(id);
            invalidateAll();
            showNotice("Incident deleted");
            if (state.page > 1)
                state.page = 1;
            await loadList(true);
        }
        catch (err) {
            showApiError(err);
        }
        return;
    }
    if (target.classList.contains("editBtn")) {
        const row = target.closest("tr");
        if (!row)
            return;
        const cells = row.querySelectorAll("td");
        if (cells.length < 6)
            return;
        const dateInput = document.getElementById("dateInput");
        const tagSelect = document.getElementById("tagSelect");
        const criticalitySelect = document.getElementById("criticalitySelect");
        const reporterInput = document.getElementById("reporterInput");
        const commentInput = document.getElementById("commentInput");
        if (dateInput)
            dateInput.value = cells[1].textContent ?? "";
        if (tagSelect)
            tagSelect.value = cells[2].textContent ?? "";
        if (criticalitySelect)
            criticalitySelect.value = cells[3].textContent ?? "";
        if (reporterInput)
            reporterInput.value = cells[4].textContent ?? "";
        if (commentInput)
            commentInput.value = cells[5].textContent ?? "";
        editId = id;
        if (reporterInput)
            reporterInput.focus();
        showNotice("✏️ Режим редагування");
    }
});
document.getElementById("resetBtn")?.addEventListener("click", () => {
    editId = null;
    clearFieldErrors();
});
function validateForm() {
    clearFieldErrors();
    let valid = true;
    const dateInput = document.getElementById("dateInput");
    const tagSelect = document.getElementById("tagSelect");
    const criticalitySelect = document.getElementById("criticalitySelect");
    const reporterInput = document.getElementById("reporterInput");
    const commentInput = document.getElementById("commentInput");
    const date = dateInput ? dateInput.value : "";
    const tag = tagSelect ? tagSelect.value : "";
    const criticality = criticalitySelect ? criticalitySelect.value : "";
    const reporter = reporterInput ? reporterInput.value : "";
    const comment = commentInput ? commentInput.value : "";
    if (!date) {
        showFieldError("dateError", "Виберіть дату!");
        valid = false;
    }
    if (!tag) {
        showFieldError("tagError", "Виберіть тип!");
        valid = false;
    }
    if (!criticality) {
        showFieldError("criticalityError", "Виберіть критичність!");
        valid = false;
    }
    if (reporterInput && reporter.length < 5) {
        showFieldError("reporterError", "Ім'я мінімум 5 символів!");
        valid = false;
    }
    if (comment.length < 15) {
        showFieldError("commentError", "Опис мінімум 15 символів!");
        valid = false;
    }
    return valid;
}
function readFormDto() {
    const dateInput = document.getElementById("dateInput");
    const tagSelect = document.getElementById("tagSelect");
    const criticalitySelect = document.getElementById("criticalitySelect");
    const reporterInput = document.getElementById("reporterInput");
    const commentInput = document.getElementById("commentInput");
    return {
        date: dateInput ? dateInput.value : "",
        tag: tagSelect ? tagSelect.value : "",
        criticality: criticalitySelect ? criticalitySelect.value : "",
        reporter: reporterInput ? reporterInput.value : "",
        comment: commentInput ? commentInput.value : "",
    };
}
const dInput = document.getElementById("dateInput");
if (dInput) {
    dInput.max = new Date().toISOString().split("T")[0];
}
document.getElementById("loadThreatStats")?.addEventListener("click", async () => {
    const tagEl = document.getElementById("threatTag");
    if (!tagEl)
        return;
    const tag = tagEl.value;
    if (!tag)
        return;
    try {
        const result = await getThreatStats(tag);
        renderThreatStats(result.data);
        renderEndpointResult(result);
    }
    catch (err) {
        showApiError(err);
    }
});
document.getElementById("loadByIdBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("incidentIdInput");
    const id = input?.value.trim();
    if (!id) {
        showNotice("Enter incident id", true);
        return;
    }
    try {
        renderEndpointResult(await getIncidentById(id));
    }
    catch (err) {
        showApiError(err);
    }
});
document.getElementById("statsBtn")?.addEventListener("click", async () => {
    try {
        const result = await getStats();
        renderStats(result.data, "all");
    }
    catch (err) {
        showApiError(err);
    }
});
document.getElementById("mostFrequentBtn")?.addEventListener("click", async () => {
    try {
        const result = await getMostFrequent();
        renderStats(result.data, "top");
    }
    catch (err) {
        showApiError(err);
    }
});
checkAuth();
