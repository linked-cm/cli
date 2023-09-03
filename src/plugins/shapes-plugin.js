'use strict';
exports.__esModule = true;
/// <reference path="colors.d.ts" />
var colors = require('colors');
var ShapesPlugin = /** @class */ (function () {
  function ShapesPlugin(options) {
    if (options === void 0) {
      options = {};
    }
    this.shapeFiles = [];
    this.logMessages = true;
    this.exportRoot = '/lib';
    this.logMessages = options.debug ? options.debug : false;
  }

  ShapesPlugin.prototype.apply = function (compiler) {
    var _this = this;
    this.debug('applying');
    //when the compiler is ready to emit files
    // compiler.plugin('emit', (compilation,callback) =>
    compiler.hooks.emit.tapAsync(
      'DeclarationPlugin',
      function (compilation, callback) {
        // this.debug('emitted');
        _this.debug(Object.keys(compilation.assets));
        //collect all generated shape files
        //NOTE: at some point we decided to overwrite declaration files between emits because sometimes only one new declaration file is emitted
        //this may cause issues when you remove a file during the continuous building process, but better than the other way around for now
        for (var filename in compilation.assets) {
          if (
            filename.indexOf('.js') !== -1 &&
            filename.indexOf('.map') === -1
          ) {
            _this.debug(filename, Object.keys(compilation.assets[filename]));
            // require(filename);
            // this.declarationFiles[filename] = compilation.assets[filename];
            // this.debug('not using: '+filename);
            // delete compilation.assets[filename];
          }
        }
        //and insert that back into the assets
        // compilation.assets[this.options.out] = {
        // 	source: function () {
        // 		return combinedDeclaration;
        // 	},
        // 	size: function () {
        // 		return combinedDeclaration.length;
        // 	},
        // };
        //webpack may continue now
        callback();
      },
    );
  };
  ShapesPlugin.prototype.debug = function () {
    var msgs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      msgs[_i] = arguments[_i];
    }
    msgs.unshift('shapes:');
    // if (this.logMessages) {
    msgs = msgs.map(function (msg) {
      return colors.blue(msg);
    });
    console.log.apply(null, msgs);
    // }
  };
  ShapesPlugin.prototype.log = function () {
    var msgs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      msgs[_i] = arguments[_i];
    }
    msgs.unshift('shapes:');
    msgs = msgs.map(function (msg) {
      return colors.blue(msg);
    });
    console.log.apply(null, msgs);
  };
  return ShapesPlugin;
})();
exports['default'] = ShapesPlugin;
