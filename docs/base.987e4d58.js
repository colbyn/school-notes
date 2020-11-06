// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"tDu9":[function(require,module,exports) {
function getVariable(el, propertyName) {
  return String(getComputedStyle(el).getPropertyValue('--' + propertyName)).trim();
}

;

function processTheElements() {
  var thes = document.querySelectorAll('.the');

  for (var i = 0; i < thes.length; i++) {
    var v = getVariable(thes[i], thes[i].getAttribute('display-var')); // only mutate if it actually changed

    if (thes[i].textContent != v) {
      thes[i].textContent = v;
    }
  }
}

function _vertical(el, tb) {
  var doc, docEl, rect, win; // return zero for disconnected and hidden (display: none) elements, IE <= 11 only
  // running getBoundingClientRect() on a disconnected node in IE throws an error

  if (!el.getClientRects().length) {
    return 0;
  }

  rect = el.getBoundingClientRect();
  doc = el.ownerDocument;
  docEl = doc.documentElement;
  win = doc.defaultView;
  return rect[tb] + win.pageYOffset - docEl.clientTop;
}

function offsetTop(el) {
  return _vertical(el, "top");
}

function offsetBottom(el) {
  return _vertical(el, "bottom");
}

function offsetBaseline(el) {
  var mpbaseline = el.querySelector('.mpbaseline');
  return offsetBottom(mpbaseline);
}

function heightAboveBaseline(el) {
  var baseline = offsetBaseline(el);
  var top = offsetTop(el);
  return baseline - top;
}

function positionMarginpars() {
  var mpars = document.querySelectorAll('.marginpar > div');
  var prevBottom = 0;
  mpars.forEach(function (mpar) {
    var mpref = document.querySelector('.body #marginref-' + mpar.id);
    var baselineref = offsetBottom(mpref);
    var heightAB = heightAboveBaseline(mpar);
    var height = mpar.offsetHeight; // round to 1 digit

    var top = Math.round((baselineref - heightAB - prevBottom) * 10) / 10; // only mutate if it actually changed

    if (mpar.style.marginTop != Math.max(0, top) + "px") {
      mpar.style.marginTop = Math.max(0, top) + "px";
    } // if marginTop would have been negative, the element is now further down by that offset => add it to prevBottom


    prevBottom = baselineref - heightAB + height - Math.min(0, top);
  });
} // don't call resize event handlers too often


var optimizedResize = function () {
  var callbacks = [],
      running = false; // fired on resize event

  function resize() {
    if (!running) {
      running = true;

      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(runCallbacks);
      } else {
        setTimeout(runCallbacks, 66);
      }
    }
  } // run the actual callbacks


  function runCallbacks() {
    callbacks.forEach(function (callback) {
      callback();
    });
    running = false;
  } // adds callback to loop


  function addCallback(callback) {
    if (callback) {
      callbacks.push(callback);
    }
  }

  return {
    // public method to add additional callback
    add: function add(callback) {
      if (!callbacks.length) {
        window.addEventListener('resize', resize);
      }

      addCallback(callback);
    }
  };
}(); // setup event listeners


function completed() {
  document.removeEventListener("DOMContentLoaded", completed);
  window.removeEventListener("load", positionMarginpars);
  var observer = new MutationObserver(function () {
    processTheElements();
    positionMarginpars();
  });
  observer.observe(document, {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true
  }); // add resize event listener

  optimizedResize.add(positionMarginpars);
  processTheElements();
  positionMarginpars();
}

document.addEventListener("DOMContentLoaded", completed);
window.addEventListener("load", completed);
},{}]},{},["tDu9"], null)
//# sourceMappingURL=https://colbyn.github.io/school-notes/base.987e4d58.js.map