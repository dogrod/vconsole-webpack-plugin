/**
 * webpack plugin for vConsole
 * 
 * @see http://webpack.github.io/docs/plugins.html
 */

"use strict";

const webpack = require("webpack");
const path = require("path");
const fs = require("fs");

/**
 * prependEntry Method for webpack 4+
 * @param {Entry} originalEntry
 * @param {Entry} additionalEntries
 * @param {Array<string>} filter
 * @returns {Entry}
 * Fork from https://github.com/webpack/webpack-dev-server/blob/master/lib/utils/DevServerPlugin.js
 */
const prependEntry = (originalEntry, additionalEntries, filter) => {
  if (typeof originalEntry === "function") {
    return () =>
      Promise.resolve(originalEntry()).then((entry) =>
        prependEntry(entry, additionalEntries, filter)
      );
  }

  if (typeof originalEntry === "object" && !Array.isArray(originalEntry)) {
    /** @type {Object<string,string>} */
    const clone = {};

    Object.keys(originalEntry).forEach((key) => {
      if (!checkFilter(entry[key], filter)) {
        // entry[key] should be a string here
        const entryDescription = originalEntry[key];
        clone[key] = prependEntry(entryDescription, additionalEntries, filter);
      }
    });

    return clone;
  }

  // in this case, entry is a string or an array.
  // make sure that we do not add duplicates.
  /** @type {Entry} */
  const entriesClone = additionalEntries.slice(0);
  [].concat(originalEntry).forEach((newEntry) => {
    if (!entriesClone.includes(newEntry)) {
      entriesClone.push(newEntry);
    }
  });
  return entriesClone;
};

class vConsolePlugin {
  constructor(options) {
    this.options = Object.assign(
      {
        filter: [],
        enable: false, // 插件开关，默认“关”
      },
      options
    );
    if (typeof this.options.filter === "string") {
      this.options.filter = [this.options.filter];
    }
  }

  apply(compiler) {
    // TODO: support filter options
    const enable = this.options.enable;
    const filter = this.options.filter;

    if (enable) {
      let pathVconsole = "webpack-vconsole-plugin/src/vconsole.js";
      const additionalEntries = [pathVconsole];

      const compilerOptions = compiler.options;

      compilerOptions.entry = prependEntry(
        compilerOptions.entry || "./src",
        additionalEntries,
        filter
      );
      compiler.hooks.entryOption.call(
        compilerOptions.context,
        compilerOptions.entry
      );
    }
  }
}

function checkFilter(entries, filter) {
  for (var i = 0; i < entries.length; i++) {
    // 去重，避免两次初始化 vconsole
    if (!fs.existsSync(entries[i])) {
      // 处理 webpack-dev-server 开启的情况
      continue;
    }
    const data = codeClean((fs.readFileSync(entries[i]) || "").toString());
    if (
      data.toLowerCase().indexOf("new vconsole(") >= 0 ||
      data.indexOf("new require('vconsole") >= 0 ||
      data.indexOf('new require("vconsole') >= 0
    ) {
      return true;
    }

    // 过滤黑名单
    for (var j = 0; j < filter.length; j++) {
      if (filter[j] === entries[i]) {
        return true;
      }
    }
  }
  return false;
}

/**
 * remove comment
 */
function codeClean(str) {
  var reg = /("([^\\\"]*(\\.)?)*")|('([^\\\']*(\\.)?)*')|(\/{2,}.*?(\r|\n))|(\/\*(\n|.)*?\*\/)/g;
  return str.replace(reg, function (word) {
    // 去除注释后的文本
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? "" : word;
  });
}

module.exports = vConsolePlugin;
