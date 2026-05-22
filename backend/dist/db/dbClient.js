"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.get = get;
exports.run = run;
const db_1 = require("./db");
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db_1.db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db_1.db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
    });
}
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db_1.db.run(sql, params, function (err) {
            err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}
