/*!
  * =============================================================
  * Ender: open module JavaScript framework (https://ender.no.de)
  * Build: ender build jeesh morpheus
  * =============================================================
  */

/*!
  * Ender: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011-2012 (@ded @fat)
  * http://ender.no.de
  * License MIT
  */
(function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context

  // Implements simple module system
  // losely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {}
    , old = context['$']
    , oldRequire = context['require']
    , oldProvide = context['provide']

  function require (identifier) {
    // modules can be required from ender's build system, or found on the window
    var module = modules['$' + identifier] || window[identifier]
    if (!module) throw new Error("Ender Error: Requested module '" + identifier + "' has not been defined.")
    return module
  }

  function provide (name, what) {
    return (modules['$' + name] = what)
  }

  context['provide'] = provide
  context['require'] = require

  function aug(o, o2) {
    for (var k in o2) k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k])
    return o
  }

  /**
   * main Ender return object
   * @constructor
   * @param {Array|Node|string} s a CSS selector or DOM node(s)
   * @param {Array.|Node} r a root node(s)
   */
  function Ender(s, r) {
    var elements
      , i

    this.selector = s
    // string || node || nodelist || window
    if (typeof s == 'undefined') {
      elements = []
      this.selector = ''
    } else if (typeof s == 'string' || s.nodeName || (s.length && 'item' in s) || s == window) {
      elements = ender._select(s, r)
    } else {
      elements = isFinite(s.length) ? s : [s]
    }
    this.length = elements.length
    for (i = this.length; i--;) this[i] = elements[i]
  }

  /**
   * @param {function(el, i, inst)} fn
   * @param {Object} opt_scope
   * @returns {Ender}
   */
  Ender.prototype['forEach'] = function (fn, opt_scope) {
    var i, l
    // opt out of native forEach so we can intentionally call our own scope
    // defaulting to the current item and be able to return self
    for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(opt_scope || this[i], this[i], i, this)
    // return self for chaining
    return this
  }

  Ender.prototype.$ = ender // handy reference to self


  function ender(s, r) {
    return new Ender(s, r)
  }

  ender['_VERSION'] = '0.4.3-dev'

  ender.fn = Ender.prototype // for easy compat to jQuery plugins

  ender.ender = function (o, chain) {
    aug(chain ? Ender.prototype : ender, o)
  }

  ender._select = function (s, r) {
    if (typeof s == 'string') return (r || document).querySelectorAll(s)
    if (s.nodeName) return [s]
    return s
  }


  // use callback to receive Ender's require & provide
  ender.noConflict = function (callback) {
    context['$'] = old
    if (callback) {
      context['provide'] = oldProvide
      context['require'] = oldRequire
      callback(require, provide, this)
    }
    return this
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = ender
  // use subscript notation as extern for Closure compilation
  context['ender'] = context['$'] = context['ender'] || ender

}(this));


(function () {

  var module = { exports: {} }, exports = module.exports;

  /*!
    * Morpheus - A Brilliant Animator
    * https://github.com/ded/morpheus - (c) Dustin Diaz 2011
    * License MIT
    */
  !function (name, definition) {
    if (typeof define == 'function') define(definition)
    else if (typeof module != 'undefined') module.exports = definition()
    else this[name] = definition()
  }('morpheus', function () {
  
    var context = this
      , doc = document
      , win = window
      , html = doc.documentElement
      , thousand = 1000
      , rgbOhex = /^rgb\(|#/
      , relVal = /^([+\-])=([\d\.]+)/
      , numUnit = /^(?:[\+\-]=)?\d+(?:\.\d+)?(%|in|cm|mm|em|ex|pt|pc|px)$/
      , rotate = /rotate\(((?:[+\-]=)?([\-\d\.]+))deg\)/
      , scale = /scale\(((?:[+\-]=)?([\d\.]+))\)/
      , skew = /skew\(((?:[+\-]=)?([\-\d\.]+))deg, ?((?:[+\-]=)?([\-\d\.]+))deg\)/
      , translate = /translate\(((?:[+\-]=)?([\-\d\.]+))px, ?((?:[+\-]=)?([\-\d\.]+))px\)/
        // these elements do not require 'px'
      , unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1, transform: 1}
  
        // which property name does this browser use for transform
      , transform = function () {
          var styles = doc.createElement('a').style
            , props = ['webkitTransform','MozTransform','OTransform','msTransform','Transform'], i
          for (i = 0; i < props.length; i++) {
            if (props[i] in styles) return props[i]
          }
        }()
  
        // does this browser support the opacity property?
      , opasity = function () {
          return typeof doc.createElement('a').style.opacity !== 'undefined'
        }()
  
        // initial style is determined by the elements themselves
      , getStyle = doc.defaultView && doc.defaultView.getComputedStyle ?
          function (el, property) {
            property = property == 'transform' ? transform : property
            var value = null
              , computed = doc.defaultView.getComputedStyle(el, '')
            computed && (value = computed[camelize(property)])
            return el.style[property] || value
          } : html.currentStyle ?
  
          function (el, property) {
            property = camelize(property)
  
            if (property == 'opacity') {
              var val = 100
              try {
                val = el.filters['DXImageTransform.Microsoft.Alpha'].opacity
              } catch (e1) {
                try {
                  val = el.filters('alpha').opacity
                } catch (e2) {}
              }
              return val / 100
            }
            var value = el.currentStyle ? el.currentStyle[property] : null
            return el.style[property] || value
          } :
          function (el, property) {
            return el.style[camelize(property)]
          }
      , frame = function () {
          // native animation frames
          // http://webstuff.nfshost.com/anim-timing/Overview.html
          // http://dev.chromium.org/developers/design-documents/requestanimationframe-implementation
          return win.requestAnimationFrame  ||
            win.webkitRequestAnimationFrame ||
            win.mozRequestAnimationFrame    ||
            win.oRequestAnimationFrame      ||
            win.msRequestAnimationFrame     ||
            function (callback) {
              win.setTimeout(function () {
                callback(+new Date())
              }, 11) // these go to eleven
            }
        }()
      , children = []
  
    function has(array, elem, i) {
      if (Array.prototype.indexOf) return array.indexOf(elem)
      for (i = 0; i < array.length; ++i) {
        if (array[i] === elem) return i
      }
    }
  
    function render(t) {
      var i, found, count = children.length
      for (i = count; i--;) {
        children[i](t)
        found = true
      }
      found && frame(render)
    }
  
    function live(f) {
      if (children.push(f) === 1) render()
    }
  
    function die(f) {
      var i, rest, index = has(children, f)
      if (index >= 0) {
        rest = children.slice(index+1)
        children.length = index
        children = children.concat(rest)
      }
    }
  
    function parseTransform(style, base) {
      var values = {}, m
      if (m = style.match(rotate)) values.rotate = by(m[1], base ? base.rotate : null)
      if (m = style.match(scale)) values.scale = by(m[1], base ? base.scale : null)
      if (m = style.match(skew)) {values.skewx = by(m[1], base ? base.skewx : null); values.skewy = by(m[3], base ? base.skewy : null)}
      if (m = style.match(translate)) {values.translatex = by(m[1], base ? base.translatex : null); values.translatey = by(m[3], base ? base.translatey : null)}
      return values
    }
  
    function formatTransform(v) {
      var s = ''
      if ('rotate' in v) s += 'rotate(' + v.rotate + 'deg) '
      if ('scale' in v) s += 'scale(' + v.scale + ') '
      if ('translatex' in v) s += 'translate(' + v.translatex + 'px,' + v.translatey + 'px) '
      if ('skewx' in v) s += 'skew(' + v.skewx + 'deg,' + v.skewy + 'deg)'
      return s
    }
  
    function rgb(r, g, b) {
      return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)
    }
  
    // convert rgb and short hex to long hex
    function toHex(c) {
      var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c)
      return (m ? rgb(m[1], m[2], m[3]) : c)
        .replace(/#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3') // short skirt to long jacket
    }
  
    // change font-size => fontSize etc.
    function camelize(s) {
      return s.replace(/-(.)/g, function (m, m1) {
        return m1.toUpperCase()
      })
    }
  
    // aren't we having it?
    function fun(f) {
      return typeof f == 'function'
    }
  
    /**
      * Core tween method that requests each frame
      * @param duration: time in milliseconds. defaults to 1000
      * @param fn: tween frame callback function receiving 'position'
      * @param done {optional}: complete callback function
      * @param ease {optional}: easing method. defaults to easeOut
      * @param from {optional}: integer to start from
      * @param to {optional}: integer to end at
      * @returns method to stop the animation
      */
    function tween(duration, fn, done, ease, from, to) {
      ease = fun(ease) ? ease : morpheus.easings[ease] || function (t) {
        // default to a pleasant-to-the-eye easeOut (like native animations)
        return Math.sin(t * Math.PI / 2)
      }
      var time = duration || thousand
        , self = this
        , diff = to - from
        , start = +new Date()
        , stop = 0
        , end = 0
      live(run)
  
      function run(t) {
        var delta = t - start
        if (delta > time || stop) {
          to = isFinite(to) ? to : 1
          stop ? end && fn(to) : fn(to)
          die(run)
          return done && done.apply(self)
        }
        // if you don't specify a 'to' you can use tween as a generic delta tweener
        // cool, eh?
        isFinite(to) ?
          fn((diff * ease(delta / time)) + from) :
          fn(ease(delta / time))
      }
      return {
        stop: function (jump) {
          stop = 1
          end = jump // jump to end of animation?
          if (!jump) done = null // remove callback if not jumping to end
        }
      }
    }
  
    /**
      * generic bezier method for animating x|y coordinates
      * minimum of 2 points required (start and end).
      * first point start, last point end
      * additional control points are optional (but why else would you use this anyway ;)
      * @param points: array containing control points
         [[0, 0], [100, 200], [200, 100]]
      * @param pos: current be(tween) position represented as float  0 - 1
      * @return [x, y]
      */
    function bezier(points, pos) {
      var n = points.length, r = [], i, j
      for (i = 0; i < n; ++i) {
        r[i] = [points[i][0], points[i][1]]
      }
      for (j = 1; j < n; ++j) {
        for (i = 0; i < n - j; ++i) {
          r[i][0] = (1 - pos) * r[i][0] + pos * r[parseInt(i + 1, 10)][0]
          r[i][1] = (1 - pos) * r[i][1] + pos * r[parseInt(i + 1, 10)][1]
        }
      }
      return [r[0][0], r[0][1]]
    }
  
    // this gets you the next hex in line according to a 'position'
    function nextColor(pos, start, finish) {
      var r = [], i, e, from, to
      for (i = 0; i < 6; i++) {
        from = Math.min(15, parseInt(start.charAt(i),  16))
        to   = Math.min(15, parseInt(finish.charAt(i), 16))
        e = Math.floor((to - from) * pos + from)
        e = e > 15 ? 15 : e < 0 ? 0 : e
        r[i] = e.toString(16)
      }
      return '#' + r.join('')
    }
  
    // this retreives the frame value within a sequence
    function getTweenVal(pos, units, begin, end, k, i, v) {
      if (k == 'transform') {
        v = {}
        for(var t in begin[i][k]) {
          v[t] = (t in end[i][k]) ? Math.round(((end[i][k][t] - begin[i][k][t]) * pos + begin[i][k][t]) * thousand) / thousand : begin[i][k][t]
        }
        return v
      } else if (typeof begin[i][k] == 'string') {
        return nextColor(pos, begin[i][k], end[i][k])
      } else {
        // round so we don't get crazy long floats
        v = Math.round(((end[i][k] - begin[i][k]) * pos + begin[i][k]) * thousand) / thousand
        // some css properties don't require a unit (like zIndex, lineHeight, opacity)
        if (!(k in unitless)) v += units[i][k] || 'px'
        return v
      }
    }
  
    // support for relative movement via '+=n' or '-=n'
    function by(val, start, m, r, i) {
      return (m = relVal.exec(val)) ?
        (i = parseFloat(m[2])) && (start + (m[1] == '+' ? 1 : -1) * i) :
        parseFloat(val)
    }
  
    /**
      * morpheus:
      * @param element(s): HTMLElement(s)
      * @param options: mixed bag between CSS Style properties & animation options
      *  - {n} CSS properties|values
      *     - value can be strings, integers,
      *     - or callback function that receives element to be animated. method must return value to be tweened
      *     - relative animations start with += or -= followed by integer
      *  - duration: time in ms - defaults to 1000(ms)
      *  - easing: a transition method - defaults to an 'easeOut' algorithm
      *  - complete: a callback method for when all elements have finished
      *  - bezier: array of arrays containing x|y coordinates that define the bezier points. defaults to none
      *     - this may also be a function that receives element to be animated. it must return a value
      */
    function morpheus(elements, options) {
      var els = elements ? (els = isFinite(elements.length) ? elements : [elements]) : [], i
        , complete = options.complete
        , duration = options.duration
        , ease = options.easing
        , points = options.bezier
        , begin = []
        , end = []
        , units = []
        , bez = []
        , originalLeft
        , originalTop
  
      delete options.complete;
      delete options.duration;
      delete options.easing;
      delete options.bezier;
  
      if (points) {
        // remember the original values for top|left
        originalLeft = options.left;
        originalTop = options.top;
        delete options.right;
        delete options.bottom;
        delete options.left;
        delete options.top;
      }
  
      for (i = els.length; i--;) {
  
        // record beginning and end states to calculate positions
        begin[i] = {}
        end[i] = {}
        units[i] = {}
  
        // are we 'moving'?
        if (points) {
  
          var left = getStyle(els[i], 'left')
            , top = getStyle(els[i], 'top')
            , xy = [by(fun(originalLeft) ? originalLeft(els[i]) : originalLeft || 0, parseFloat(left)),
                    by(fun(originalTop) ? originalTop(els[i]) : originalTop || 0, parseFloat(top))]
  
          bez[i] = fun(points) ? points(els[i], xy) : points
          bez[i].push(xy)
          bez[i].unshift([
              parseInt(left, 10)
            , parseInt(top, 10)
          ])
        }
  
        for (var k in options) {
          var v = getStyle(els[i], k), unit
            , tmp = fun(options[k]) ? options[k](els[i]) : options[k]
          if (typeof tmp == 'string' &&
              rgbOhex.test(tmp) &&
              !rgbOhex.test(v)) {
            delete options[k]; // remove key :(
            continue; // cannot animate colors like 'orange' or 'transparent'
                      // only #xxx, #xxxxxx, rgb(n,n,n)
          }
  
          begin[i][k] = k == 'transform' ? parseTransform(v) :
            typeof tmp == 'string' && rgbOhex.test(tmp) ?
              toHex(v).slice(1) :
              parseFloat(v)
          end[i][k] = k == 'transform' ? parseTransform(tmp,begin[i][k]) :
            typeof tmp == 'string' && tmp.charAt(0) == '#' ?
              toHex(tmp).slice(1) :
              by(tmp, parseFloat(v));
          // record original unit
          (typeof tmp == 'string') && (unit = tmp.match(numUnit)) && (units[i][k] = unit[1])
        }
      }
      // ONE TWEEN TO RULE THEM ALL
      return tween.apply(els, [duration, function (pos, v, xy) {
        // normally not a fan of optimizing for() loops, but we want something
        // fast for animating
        for (i = els.length; i--;) {
          if (points) {
            xy = bezier(bez[i], pos)
            els[i].style.left = xy[0] + 'px'
            els[i].style.top = xy[1] + 'px'
          }
          for (var k in options) {
            v = getTweenVal(pos, units, begin, end, k, i)
            k == 'transform' ?
              els[i].style[transform] = formatTransform(v) :
              k == 'opacity' && !opasity ?
                (els[i].style.filter = 'alpha(opacity=' + (v * 100) + ')') :
                (els[i].style[camelize(k)] = v)
          }
        }
      }, complete, ease])
    }
  
    // expose useful methods
    morpheus.tween = tween
    morpheus.getStyle = getStyle
    morpheus.bezier = bezier
    morpheus.transform = transform
    morpheus.parseTransform = parseTransform
    morpheus.formatTransform = formatTransform
    morpheus.easings = {}
  
    return morpheus
  
  })
  

  provide("morpheus", module.exports);

  var morpheus = require('morpheus')
  !function ($) {
    $.ender({
      animate: function (options) {
        return morpheus(this, options)
      }
    , fadeIn: function (d, fn) {
        return morpheus(this, {
            duration: d
          , opacity: 1
          , complete: fn
        })
      }
    , fadeOut: function (d, fn) {
        return morpheus(this, {
            duration: d
          , opacity: 0
          , complete: fn
        })
      }
    }, true)
    $.ender({
      tween: morpheus.tween
    })
  }(ender)

}());

(function () {

  var module = { exports: {} }, exports = module.exports;

  /*!
    * bean.js - copyright Jacob Thornton 2011
    * https://github.com/fat/bean
    * MIT License
    * special thanks to:
    * dean edwards: http://dean.edwards.name/
    * dperini: https://github.com/dperini/nwevents
    * the entire mootools team: github.com/mootools/mootools-core
    */
  !function (name, context, definition) {
    if (typeof module !== 'undefined') module.exports = definition(name, context);
    else if (typeof define === 'function' && typeof define.amd  === 'object') define(definition);
    else context[name] = definition(name, context);
  }('bean', this, function (name, context) {
    var win = window
      , old = context[name]
      , overOut = /over|out/
      , namespaceRegex = /[^\.]*(?=\..*)\.|.*/
      , nameRegex = /\..*/
      , addEvent = 'addEventListener'
      , attachEvent = 'attachEvent'
      , removeEvent = 'removeEventListener'
      , detachEvent = 'detachEvent'
      , ownerDocument = 'ownerDocument'
      , targetS = 'target'
      , qSA = 'querySelectorAll'
      , doc = document || {}
      , root = doc.documentElement || {}
      , W3C_MODEL = root[addEvent]
      , eventSupport = W3C_MODEL ? addEvent : attachEvent
      , slice = Array.prototype.slice
      , mouseTypeRegex = /click|mouse(?!(.*wheel|scroll))|menu|drag|drop/i
      , mouseWheelTypeRegex = /mouse.*(wheel|scroll)/i
      , textTypeRegex = /^text/i
      , touchTypeRegex = /^touch|^gesture/i
      , ONE = {} // singleton for quick matching making add() do one()
  
      , nativeEvents = (function (hash, events, i) {
          for (i = 0; i < events.length; i++)
            hash[events[i]] = 1
          return hash
        }({}, (
            'click dblclick mouseup mousedown contextmenu ' +                  // mouse buttons
            'mousewheel mousemultiwheel DOMMouseScroll ' +                     // mouse wheel
            'mouseover mouseout mousemove selectstart selectend ' +            // mouse movement
            'keydown keypress keyup ' +                                        // keyboard
            'orientationchange ' +                                             // mobile
            'focus blur change reset select submit ' +                         // form elements
            'load unload beforeunload resize move DOMContentLoaded '+          // window
            'readystatechange message ' +                                      // window
            'error abort scroll ' +                                            // misc
            (W3C_MODEL ? // element.fireEvent('onXYZ'... is not forgiving if we try to fire an event
                         // that doesn't actually exist, so make sure we only do these on newer browsers
              'show ' +                                                          // mouse buttons
              'input invalid ' +                                                 // form elements
              'touchstart touchmove touchend touchcancel ' +                     // touch
              'gesturestart gesturechange gestureend ' +                         // gesture
              'readystatechange pageshow pagehide popstate ' +                   // window
              'hashchange offline online ' +                                     // window
              'afterprint beforeprint ' +                                        // printing
              'dragstart dragenter dragover dragleave drag drop dragend ' +      // dnd
              'loadstart progress suspend emptied stalled loadmetadata ' +       // media
              'loadeddata canplay canplaythrough playing waiting seeking ' +     // media
              'seeked ended durationchange timeupdate play pause ratechange ' +  // media
              'volumechange cuechange ' +                                        // media
              'checking noupdate downloading cached updateready obsolete ' +     // appcache
              '' : '')
          ).split(' ')
        ))
  
      , customEvents = (function () {
          var cdp = 'compareDocumentPosition'
            , isAncestor = cdp in root
                ? function (element, container) {
                    return container[cdp] && (container[cdp](element) & 16) === 16
                  }
                : 'contains' in root
                  ? function (element, container) {
                      container = container.nodeType === 9 || container === window ? root : container
                      return container !== element && container.contains(element)
                    }
                  : function (element, container) {
                      while (element = element.parentNode) if (element === container) return 1
                      return 0
                    }
  
          function check(event) {
            var related = event.relatedTarget
            return !related
              ? related === null
              : (related !== this && related.prefix !== 'xul' && !/document/.test(this.toString()) && !isAncestor(related, this))
          }
  
          return {
              mouseenter: { base: 'mouseover', condition: check }
            , mouseleave: { base: 'mouseout', condition: check }
            , mousewheel: { base: /Firefox/.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel' }
          }
        }())
  
      , fixEvent = (function () {
          var commonProps = 'altKey attrChange attrName bubbles cancelable ctrlKey currentTarget detail eventPhase getModifierState isTrusted metaKey relatedNode relatedTarget shiftKey srcElement target timeStamp type view which'.split(' ')
            , mouseProps = commonProps.concat('button buttons clientX clientY dataTransfer fromElement offsetX offsetY pageX pageY screenX screenY toElement'.split(' '))
            , mouseWheelProps = mouseProps.concat('wheelDelta wheelDeltaX wheelDeltaY wheelDeltaZ axis'.split(' ')) // 'axis' is FF specific
            , keyProps = commonProps.concat('char charCode key keyCode keyIdentifier keyLocation'.split(' '))
            , textProps = commonProps.concat(['data'])
            , touchProps = commonProps.concat('touches targetTouches changedTouches scale rotation'.split(' '))
            , messageProps = commonProps.concat(['data', 'origin', 'source'])
            , preventDefault = 'preventDefault'
            , createPreventDefault = function (event) {
                return function () {
                  if (event[preventDefault])
                    event[preventDefault]()
                  else
                    event.returnValue = false
                }
              }
            , stopPropagation = 'stopPropagation'
            , createStopPropagation = function (event) {
                return function () {
                  if (event[stopPropagation])
                    event[stopPropagation]()
                  else
                    event.cancelBubble = true
                }
              }
            , createStop = function (synEvent) {
                return function () {
                  synEvent[preventDefault]()
                  synEvent[stopPropagation]()
                  synEvent.stopped = true
                }
              }
            , copyProps = function (event, result, props) {
                var i, p
                for (i = props.length; i--;) {
                  p = props[i]
                  if (!(p in result) && p in event) result[p] = event[p]
                }
              }
  
          return function (event, isNative) {
            var result = { originalEvent: event, isNative: isNative }
            if (!event)
              return result
  
            var props
              , type = event.type
              , target = event[targetS] || event.srcElement
  
            result[preventDefault] = createPreventDefault(event)
            result[stopPropagation] = createStopPropagation(event)
            result.stop = createStop(result)
            result[targetS] = target && target.nodeType === 3 ? target.parentNode : target
  
            if (isNative) { // we only need basic augmentation on custom events, the rest is too expensive
              if (type.indexOf('key') !== -1) {
                props = keyProps
                result.keyCode = event.keyCode || event.which
              } else if (mouseTypeRegex.test(type)) {
                props = mouseProps
                result.rightClick = event.which === 3 || event.button === 2
                result.pos = { x: 0, y: 0 }
                if (event.pageX || event.pageY) {
                  result.clientX = event.pageX
                  result.clientY = event.pageY
                } else if (event.clientX || event.clientY) {
                  result.clientX = event.clientX + doc.body.scrollLeft + root.scrollLeft
                  result.clientY = event.clientY + doc.body.scrollTop + root.scrollTop
                }
                if (overOut.test(type))
                  result.relatedTarget = event.relatedTarget || event[(type === 'mouseover' ? 'from' : 'to') + 'Element']
              } else if (touchTypeRegex.test(type)) {
                props = touchProps
              } else if (mouseWheelTypeRegex.test(type)) {
                props = mouseWheelProps
              } else if (textTypeRegex.test(type)) {
                props = textProps
              } else if (type === 'message') {
                props = messageProps
              }
              copyProps(event, result, props || commonProps)
            }
            return result
          }
        }())
  
        // if we're in old IE we can't do onpropertychange on doc or win so we use doc.documentElement for both
      , targetElement = function (element, isNative) {
          return !W3C_MODEL && !isNative && (element === doc || element === win) ? root : element
        }
  
        // we use one of these per listener, of any type
      , RegEntry = (function () {
          function entry(element, type, handler, original, namespaces) {
            var isNative = this.isNative = nativeEvents[type] && element[eventSupport]
            this.element = element
            this.type = type
            this.handler = handler
            this.original = original
            this.namespaces = namespaces
            this.custom = customEvents[type]
            this.eventType = W3C_MODEL || isNative ? type : 'propertychange'
            this.customType = !W3C_MODEL && !isNative && type
            this[targetS] = targetElement(element, isNative)
            this[eventSupport] = this[targetS][eventSupport]
          }
  
          entry.prototype = {
              // given a list of namespaces, is our entry in any of them?
              inNamespaces: function (checkNamespaces) {
                var i, j
                if (!checkNamespaces)
                  return true
                if (!this.namespaces)
                  return false
                for (i = checkNamespaces.length; i--;) {
                  for (j = this.namespaces.length; j--;) {
                    if (checkNamespaces[i] === this.namespaces[j])
                      return true
                  }
                }
                return false
              }
  
              // match by element, original fn (opt), handler fn (opt)
            , matches: function (checkElement, checkOriginal, checkHandler) {
                return this.element === checkElement &&
                  (!checkOriginal || this.original === checkOriginal) &&
                  (!checkHandler || this.handler === checkHandler)
              }
          }
  
          return entry
        }())
  
      , registry = (function () {
          // our map stores arrays by event type, just because it's better than storing
          // everything in a single array. uses '$' as a prefix for the keys for safety
          var map = {}
  
            // generic functional search of our registry for matching listeners,
            // `fn` returns false to break out of the loop
            , forAll = function (element, type, original, handler, fn) {
                if (!type || type === '*') {
                  // search the whole registry
                  for (var t in map) {
                    if (t.charAt(0) === '$')
                      forAll(element, t.substr(1), original, handler, fn)
                  }
                } else {
                  var i = 0, l, list = map['$' + type], all = element === '*'
                  if (!list)
                    return
                  for (l = list.length; i < l; i++) {
                    if (all || list[i].matches(element, original, handler))
                      if (!fn(list[i], list, i, type))
                        return
                  }
                }
              }
  
            , has = function (element, type, original) {
                // we're not using forAll here simply because it's a bit slower and this
                // needs to be fast
                var i, list = map['$' + type]
                if (list) {
                  for (i = list.length; i--;) {
                    if (list[i].matches(element, original, null))
                      return true
                  }
                }
                return false
              }
  
            , get = function (element, type, original) {
                var entries = []
                forAll(element, type, original, null, function (entry) { return entries.push(entry) })
                return entries
              }
  
            , put = function (entry) {
                (map['$' + entry.type] || (map['$' + entry.type] = [])).push(entry)
                return entry
              }
  
            , del = function (entry) {
                forAll(entry.element, entry.type, null, entry.handler, function (entry, list, i) {
                  list.splice(i, 1)
                  if (list.length === 0)
                    delete map['$' + entry.type]
                  return false
                })
              }
  
              // dump all entries, used for onunload
            , entries = function () {
                var t, entries = []
                for (t in map) {
                  if (t.charAt(0) === '$')
                    entries = entries.concat(map[t])
                }
                return entries
              }
  
          return { has: has, get: get, put: put, del: del, entries: entries }
        }())
  
      , selectorEngine = doc[qSA]
          ? function (s, r) {
              return r[qSA](s)
            }
          : function () {
              throw new Error('Bean: No selector engine installed') // eeek
            }
  
      , setSelectorEngine = function (e) {
          selectorEngine = e
        }
  
        // add and remove listeners to DOM elements
      , listener = W3C_MODEL ? function (element, type, fn, add) {
          element[add ? addEvent : removeEvent](type, fn, false)
        } : function (element, type, fn, add, custom) {
          if (custom && add && element['_on' + custom] === null)
            element['_on' + custom] = 0
          element[add ? attachEvent : detachEvent]('on' + type, fn)
        }
  
      , nativeHandler = function (element, fn, args) {
          var beanDel = fn.__beanDel
            , handler = function (event) {
            event = fixEvent(event || ((this[ownerDocument] || this.document || this).parentWindow || win).event, true)
            if (beanDel) // delegated event, fix the fix
              event.currentTarget = beanDel.ft(event[targetS], element)
            return fn.apply(element, [event].concat(args))
          }
          handler.__beanDel = beanDel
          return handler
        }
  
      , customHandler = function (element, fn, type, condition, args, isNative) {
          var beanDel = fn.__beanDel
            , handler = function (event) {
            var target = beanDel ? beanDel.ft(event[targetS], element) : this // deleated event
            if (condition ? condition.apply(target, arguments) : W3C_MODEL ? true : event && event.propertyName === '_on' + type || !event) {
              if (event) {
                event = fixEvent(event || ((this[ownerDocument] || this.document || this).parentWindow || win).event, isNative)
                event.currentTarget = target
              }
              fn.apply(element, event && (!args || args.length === 0) ? arguments : slice.call(arguments, event ? 0 : 1).concat(args))
            }
          }
          handler.__beanDel = beanDel
          return handler
        }
  
      , once = function (rm, element, type, fn, originalFn) {
          // wrap the handler in a handler that does a remove as well
          return function () {
            rm(element, type, originalFn)
            fn.apply(this, arguments)
          }
        }
  
      , removeListener = function (element, orgType, handler, namespaces) {
          var i, l, entry
            , type = (orgType && orgType.replace(nameRegex, ''))
            , handlers = registry.get(element, type, handler)
  
          for (i = 0, l = handlers.length; i < l; i++) {
            if (handlers[i].inNamespaces(namespaces)) {
              if ((entry = handlers[i])[eventSupport])
                listener(entry[targetS], entry.eventType, entry.handler, false, entry.type)
              // TODO: this is problematic, we have a registry.get() and registry.del() that
              // both do registry searches so we waste cycles doing this. Needs to be rolled into
              // a single registry.forAll(fn) that removes while finding, but the catch is that
              // we'll be splicing the arrays that we're iterating over. Needs extra tests to
              // make sure we don't screw it up. @rvagg
              registry.del(entry)
            }
          }
        }
  
      , addListener = function (element, orgType, fn, originalFn, args) {
          var entry
            , type = orgType.replace(nameRegex, '')
            , namespaces = orgType.replace(namespaceRegex, '').split('.')
  
          if (registry.has(element, type, fn))
            return element // no dupe
          if (type === 'unload')
            fn = once(removeListener, element, type, fn, originalFn) // self clean-up
          if (customEvents[type]) {
            if (customEvents[type].condition)
              fn = customHandler(element, fn, type, customEvents[type].condition, args, true)
            type = customEvents[type].base || type
          }
          entry = registry.put(new RegEntry(element, type, fn, originalFn, namespaces[0] && namespaces))
          entry.handler = entry.isNative ?
            nativeHandler(element, entry.handler, args) :
            customHandler(element, entry.handler, type, false, args, false)
          if (entry[eventSupport])
            listener(entry[targetS], entry.eventType, entry.handler, true, entry.customType)
        }
  
      , del = function (selector, fn, $) {
              //TODO: findTarget (therefore $) is called twice, once for match and once for
              // setting e.currentTarget, fix this so it's only needed once
          var findTarget = function (target, root) {
                var i, array = typeof selector === 'string' ? $(selector, root) : selector
                for (; target && target !== root; target = target.parentNode) {
                  for (i = array.length; i--;) {
                    if (array[i] === target)
                      return target
                  }
                }
              }
            , handler = function (e) {
                var match = findTarget(e[targetS], this)
                match && fn.apply(match, arguments)
              }
  
          handler.__beanDel = {
              ft: findTarget // attach it here for customEvents to use too
            , selector: selector
            , $: $
          }
          return handler
        }
  
      , remove = function (element, typeSpec, fn) {
          var k, type, namespaces, i
            , rm = removeListener
            , isString = typeSpec && typeof typeSpec === 'string'
  
          if (isString && typeSpec.indexOf(' ') > 0) {
            // remove(el, 't1 t2 t3', fn) or remove(el, 't1 t2 t3')
            typeSpec = typeSpec.split(' ')
            for (i = typeSpec.length; i--;)
              remove(element, typeSpec[i], fn)
            return element
          }
          type = isString && typeSpec.replace(nameRegex, '')
          if (type && customEvents[type])
            type = customEvents[type].type
          if (!typeSpec || isString) {
            // remove(el) or remove(el, t1.ns) or remove(el, .ns) or remove(el, .ns1.ns2.ns3)
            if (namespaces = isString && typeSpec.replace(namespaceRegex, ''))
              namespaces = namespaces.split('.')
            rm(element, type, fn, namespaces)
          } else if (typeof typeSpec === 'function') {
            // remove(el, fn)
            rm(element, null, typeSpec)
          } else {
            // remove(el, { t1: fn1, t2, fn2 })
            for (k in typeSpec) {
              if (typeSpec.hasOwnProperty(k))
                remove(element, k, typeSpec[k])
            }
          }
          return element
        }
  
        // 5th argument, $=selector engine, is deprecated and will be removed
      , add = function (element, events, fn, delfn, $) {
          var type, types, i, args
            , originalFn = fn
            , isDel = fn && typeof fn === 'string'
  
          if (events && !fn && typeof events === 'object') {
            for (type in events) {
              if (events.hasOwnProperty(type))
                add.apply(this, [ element, type, events[type] ])
            }
          } else {
            args = arguments.length > 3 ? slice.call(arguments, 3) : []
            types = (isDel ? fn : events).split(' ')
            isDel && (fn = del(events, (originalFn = delfn), $ || selectorEngine)) && (args = slice.call(args, 1))
            // special case for one()
            this === ONE && (fn = once(remove, element, events, fn, originalFn))
            for (i = types.length; i--;) addListener(element, types[i], fn, originalFn, args)
          }
          return element
        }
  
      , one = function () {
          return add.apply(ONE, arguments)
        }
  
      , fireListener = W3C_MODEL ? function (isNative, type, element) {
          var evt = doc.createEvent(isNative ? 'HTMLEvents' : 'UIEvents')
          evt[isNative ? 'initEvent' : 'initUIEvent'](type, true, true, win, 1)
          element.dispatchEvent(evt)
        } : function (isNative, type, element) {
          element = targetElement(element, isNative)
          // if not-native then we're using onpropertychange so we just increment a custom property
          isNative ? element.fireEvent('on' + type, doc.createEventObject()) : element['_on' + type]++
        }
  
      , fire = function (element, type, args) {
          var i, j, l, names, handlers
            , types = type.split(' ')
  
          for (i = types.length; i--;) {
            type = types[i].replace(nameRegex, '')
            if (names = types[i].replace(namespaceRegex, ''))
              names = names.split('.')
            if (!names && !args && element[eventSupport]) {
              fireListener(nativeEvents[type], type, element)
            } else {
              // non-native event, either because of a namespace, arguments or a non DOM element
              // iterate over all listeners and manually 'fire'
              handlers = registry.get(element, type)
              args = [false].concat(args)
              for (j = 0, l = handlers.length; j < l; j++) {
                if (handlers[j].inNamespaces(names))
                  handlers[j].handler.apply(element, args)
              }
            }
          }
          return element
        }
  
      , clone = function (element, from, type) {
          var i = 0
            , handlers = registry.get(from, type)
            , l = handlers.length
            , args, beanDel
  
          for (;i < l; i++) {
            if (handlers[i].original) {
              beanDel = handlers[i].handler.__beanDel
              if (beanDel) {
                args = [ element, beanDel.selector, handlers[i].type, handlers[i].original, beanDel.$]
              } else
                args = [ element, handlers[i].type, handlers[i].original ]
              add.apply(null, args)
            }
          }
          return element
        }
  
      , bean = {
            add: add
          , one: one
          , remove: remove
          , clone: clone
          , fire: fire
          , setSelectorEngine: setSelectorEngine
          , noConflict: function () {
              context[name] = old
              return this
            }
        }
  
    if (win[attachEvent]) {
      // for IE, clean up on unload to avoid leaks
      var cleanup = function () {
        var i, entries = registry.entries()
        for (i in entries) {
          if (entries[i].type && entries[i].type !== 'unload')
            remove(entries[i].element, entries[i].type)
        }
        win[detachEvent]('onunload', cleanup)
        win.CollectGarbage && win.CollectGarbage()
      }
      win[attachEvent]('onunload', cleanup)
    }
  
    return bean
  })
  

  provide("bean", module.exports);

  !function ($) {
    var b = require('bean')
      , integrate = function (method, type, method2) {
          var _args = type ? [type] : []
          return function () {
            for (var i = 0, l = this.length; i < l; i++) {
              if (!arguments.length && method == 'add' && type) method = 'fire'
              b[method].apply(this, [this[i]].concat(_args, Array.prototype.slice.call(arguments, 0)))
            }
            return this
          }
        }
      , add = integrate('add')
      , remove = integrate('remove')
      , fire = integrate('fire')
  
      , methods = {
            on: add // NOTE: .on() is likely to change in the near future, don't rely on this as-is see https://github.com/fat/bean/issues/55
          , addListener: add
          , bind: add
          , listen: add
          , delegate: add
  
          , one: integrate('one')
  
          , off: remove
          , unbind: remove
          , unlisten: remove
          , removeListener: remove
          , undelegate: remove
  
          , emit: fire
          , trigger: fire
  
          , cloneEvents: integrate('clone')
  
          , hover: function (enter, leave, i) { // i for internal
              for (i = this.length; i--;) {
                b.add.call(this, this[i], 'mouseenter', enter)
                b.add.call(this, this[i], 'mouseleave', leave)
              }
              return this
            }
        }
  
      , shortcuts =
           ('blur change click dblclick error focus focusin focusout keydown keypress '
          + 'keyup load mousedown mouseenter mouseleave mouseout mouseover mouseup '
          + 'mousemove resize scroll select submit unload').split(' ')
  
    for (var i = shortcuts.length; i--;) {
      methods[shortcuts[i]] = integrate('add', shortcuts[i])
    }
  
    b.setSelectorEngine($)
  
    $.ender(methods, true)
  }(ender)
  

}());

(function () {

  var module = { exports: {} }, exports = module.exports;

  /*!
    * Bonzo: DOM Utility (c) Dustin Diaz 2012
    * https://github.com/ded/bonzo
    * License MIT
    */
  (function (name, definition, context) {
    if (typeof module != 'undefined' && module.exports) module.exports = definition()
    else if (typeof context['define'] != 'undefined' && context['define'] == 'function' && context['define']['amd']) define(name, definition)
    else context[name] = definition()
  })('bonzo', function() {
    var context = this
      , win = window
      , doc = win.document
      , html = doc.documentElement
      , parentNode = 'parentNode'
      , query = null
      , specialAttributes = /^(checked|value|selected)$/i
      , specialTags = /^(select|fieldset|table|tbody|tfoot|td|tr|colgroup)$/i // tags that we have trouble inserting *into*
      , table = ['<table>', '</table>', 1]
      , td = ['<table><tbody><tr>', '</tr></tbody></table>', 3]
      , option = ['<select>', '</select>', 1]
      , noscope = ['_', '', 0, 1]
      , tagMap = { // tags that we have trouble *inserting*
            thead: table, tbody: table, tfoot: table, colgroup: table, caption: table
          , tr: ['<table><tbody>', '</tbody></table>', 2]
          , th: td , td: td
          , col: ['<table><colgroup>', '</colgroup></table>', 2]
          , fieldset: ['<form>', '</form>', 1]
          , legend: ['<form><fieldset>', '</fieldset></form>', 2]
          , option: option, optgroup: option
          , script: noscope, style: noscope, link: noscope, param: noscope, base: noscope
        }
      , stateAttributes = /^(checked|selected)$/
      , ie = /msie/i.test(navigator.userAgent)
      , hasClass, addClass, removeClass
      , uidMap = {}
      , uuids = 0
      , digit = /^-?[\d\.]+$/
      , dattr = /^data-(.+)$/
      , px = 'px'
      , setAttribute = 'setAttribute'
      , getAttribute = 'getAttribute'
      , byTag = 'getElementsByTagName'
      , features = function() {
          var e = doc.createElement('p')
          e.innerHTML = '<a href="#x">x</a><table style="float:left;"></table>'
          return {
            hrefExtended: e[byTag]('a')[0][getAttribute]('href') != '#x' // IE < 8
          , autoTbody: e[byTag]('tbody').length !== 0 // IE < 8
          , computedStyle: doc.defaultView && doc.defaultView.getComputedStyle
          , cssFloat: e[byTag]('table')[0].style.styleFloat ? 'styleFloat' : 'cssFloat'
          , transform: function () {
              var props = ['webkitTransform', 'MozTransform', 'OTransform', 'msTransform', 'Transform'], i
              for (i = 0; i < props.length; i++) {
                if (props[i] in e.style) return props[i]
              }
            }()
          , classList: 'classList' in e
          }
        }()
      , trimReplace = /(^\s*|\s*$)/g
      , whitespaceRegex = /\s+/
      , toString = String.prototype.toString
      , unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1, boxFlex: 1, WebkitBoxFlex: 1, MozBoxFlex: 1 }
      , trim = String.prototype.trim ?
          function (s) {
            return s.trim()
          } :
          function (s) {
            return s.replace(trimReplace, '')
          }
  
    function classReg(c) {
      return new RegExp("(^|\\s+)" + c + "(\\s+|$)")
    }
  
    function each(ar, fn, scope) {
      for (var i = 0, l = ar.length; i < l; i++) fn.call(scope || ar[i], ar[i], i, ar)
      return ar
    }
  
    function deepEach(ar, fn, scope) {
      for (var i = 0, l = ar.length; i < l; i++) {
        if (isNode(ar[i])) {
          deepEach(ar[i].childNodes, fn, scope)
          fn.call(scope || ar[i], ar[i], i, ar)
        }
      }
      return ar
    }
  
    function camelize(s) {
      return s.replace(/-(.)/g, function (m, m1) {
        return m1.toUpperCase()
      })
    }
  
    function decamelize(s) {
      return s ? s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() : s
    }
  
    function data(el) {
      el[getAttribute]('data-node-uid') || el[setAttribute]('data-node-uid', ++uuids)
      var uid = el[getAttribute]('data-node-uid')
      return uidMap[uid] || (uidMap[uid] = {})
    }
  
    function clearData(el) {
      var uid = el[getAttribute]('data-node-uid')
      if (uid) delete uidMap[uid]
    }
  
    function dataValue(d, f) {
      try {
        return (d === null || d === undefined) ? undefined :
          d === 'true' ? true :
            d === 'false' ? false :
              d === 'null' ? null :
                (f = parseFloat(d)) == d ? f : d;
      } catch(e) {}
      return undefined
    }
  
    function isNode(node) {
      return node && node.nodeName && node.nodeType == 1
    }
  
    function some(ar, fn, scope, i, j) {
      for (i = 0, j = ar.length; i < j; ++i) if (fn.call(scope, ar[i], i, ar)) return true
      return false
    }
  
    function styleProperty(p) {
        (p == 'transform' && (p = features.transform)) ||
          (/^transform-?[Oo]rigin$/.test(p) && (p = features.transform + "Origin")) ||
          (p == 'float' && (p = features.cssFloat))
        return p ? camelize(p) : null
    }
  
    var getStyle = features.computedStyle ?
      function (el, property) {
        var value = null
          , computed = doc.defaultView.getComputedStyle(el, '')
        computed && (value = computed[property])
        return el.style[property] || value
      } :
  
      (ie && html.currentStyle) ?
  
      function (el, property) {
        if (property == 'opacity') {
          var val = 100
          try {
            val = el.filters['DXImageTransform.Microsoft.Alpha'].opacity
          } catch (e1) {
            try {
              val = el.filters('alpha').opacity
            } catch (e2) {}
          }
          return val / 100
        }
        var value = el.currentStyle ? el.currentStyle[property] : null
        return el.style[property] || value
      } :
  
      function (el, property) {
        return el.style[property]
      }
  
    // this insert method is intense
    function insert(target, host, fn) {
      var i = 0, self = host || this, r = []
        // target nodes could be a css selector if it's a string and a selector engine is present
        // otherwise, just use target
        , nodes = query && typeof target == 'string' && target.charAt(0) != '<' ? query(target) : target
      // normalize each node in case it's still a string and we need to create nodes on the fly
      each(normalize(nodes), function (t) {
        each(self, function (el) {
          var n = !el[parentNode] || (el[parentNode] && !el[parentNode][parentNode]) ?
            function () {
              var c = el.cloneNode(true)
                , cloneElems
                , elElems
  
              // check for existence of an event cloner
              // preferably https://github.com/fat/bean
              // otherwise Bonzo won't do this for you
              if (self.$ && self.cloneEvents) {
                self.$(c).cloneEvents(el)
  
                // clone events from every child node
                cloneElems = self.$(c).find('*')
                elElems = self.$(el).find('*')
  
                for (var i = 0; i < elElems.length; i++)
                  self.$(cloneElems[i]).cloneEvents(elElems[i])
              }
              return c
            }() : el
          fn(t, n)
          r[i] = n
          i++
        })
      }, this)
      each(r, function (e, i) {
        self[i] = e
      })
      self.length = i
      return self
    }
  
    function xy(el, x, y) {
      var $el = bonzo(el)
        , style = $el.css('position')
        , offset = $el.offset()
        , rel = 'relative'
        , isRel = style == rel
        , delta = [parseInt($el.css('left'), 10), parseInt($el.css('top'), 10)]
  
      if (style == 'static') {
        $el.css('position', rel)
        style = rel
      }
  
      isNaN(delta[0]) && (delta[0] = isRel ? 0 : el.offsetLeft)
      isNaN(delta[1]) && (delta[1] = isRel ? 0 : el.offsetTop)
  
      x != null && (el.style.left = x - offset.left + delta[0] + px)
      y != null && (el.style.top = y - offset.top + delta[1] + px)
  
    }
  
    // classList support for class management
    // altho to be fair, the api sucks because it won't accept multiple classes at once
    // so we iterate down below
    if (features.classList) {
      hasClass = function (el, c) {
        return el.classList.contains(c)
      }
      addClass = function (el, c) {
        el.classList.add(c)
      }
      removeClass = function (el, c) {
        el.classList.remove(c)
      }
    }
    else {
      hasClass = function (el, c) {
        return classReg(c).test(el.className)
      }
      addClass = function (el, c) {
        el.className = trim(el.className + ' ' + c)
      }
      removeClass = function (el, c) {
        el.className = trim(el.className.replace(classReg(c), ' '))
      }
    }
  
  
    // this allows method calling for setting values
    // example:
    // bonzo(elements).css('color', function (el) {
    //   return el.getAttribute('data-original-color')
    // })
    function setter(el, v) {
      return typeof v == 'function' ? v(el) : v
    }
  
    function Bonzo(elements) {
      this.length = 0
      if (elements) {
        elements = typeof elements !== 'string' &&
          !elements.nodeType &&
          typeof elements.length !== 'undefined' ?
            elements :
            [elements]
        this.length = elements.length
        for (var i = 0; i < elements.length; i++) this[i] = elements[i]
      }
    }
  
    Bonzo.prototype = {
  
        // indexr method, because jQueriers want this method. Jerks
        get: function (index) {
          return this[index] || null
        }
  
        // itetators
      , each: function (fn, scope) {
          return each(this, fn, scope)
        }
  
      , deepEach: function (fn, scope) {
          return deepEach(this, fn, scope)
        }
  
      , map: function (fn, reject) {
          var m = [], n, i
          for (i = 0; i < this.length; i++) {
            n = fn.call(this, this[i], i)
            reject ? (reject(n) && m.push(n)) : m.push(n)
          }
          return m
        }
  
      // text and html inserters!
      , html: function (h, text) {
          var method = text ?
            html.textContent === undefined ?
              'innerText' :
              'textContent' :
            'innerHTML';
          function append(el) {
            each(normalize(h), function (node) {
              el.appendChild(node)
            })
          }
          return typeof h !== 'undefined' ?
              this.empty().each(function (el) {
                !text && specialTags.test(el.tagName) ?
                  append(el) :
                  (function () {
                    try { (el[method] = h) }
                    catch(e) { append(el) }
                  }())
              }) :
            this[0] ? this[0][method] : ''
        }
  
      , text: function (text) {
          return this.html(text, 1)
        }
  
        // more related insertion methods
      , append: function (node) {
          return this.each(function (el) {
            each(normalize(node), function (i) {
              el.appendChild(i)
            })
          })
        }
  
      , prepend: function (node) {
          return this.each(function (el) {
            var first = el.firstChild
            each(normalize(node), function (i) {
              el.insertBefore(i, first)
            })
          })
        }
  
      , appendTo: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            t.appendChild(el)
          })
        }
  
      , prependTo: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            t.insertBefore(el, t.firstChild)
          })
        }
  
      , before: function (node) {
          return this.each(function (el) {
            each(bonzo.create(node), function (i) {
              el[parentNode].insertBefore(i, el)
            })
          })
        }
  
      , after: function (node) {
          return this.each(function (el) {
            each(bonzo.create(node), function (i) {
              el[parentNode].insertBefore(i, el.nextSibling)
            })
          })
        }
  
      , insertBefore: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            t[parentNode].insertBefore(el, t)
          })
        }
  
      , insertAfter: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            var sibling = t.nextSibling
            if (sibling) {
              t[parentNode].insertBefore(el, sibling);
            }
            else {
              t[parentNode].appendChild(el)
            }
          })
        }
  
      , replaceWith: function(html) {
          this.deepEach(clearData)
  
          return this.each(function (el) {
            el.parentNode.replaceChild(bonzo.create(html)[0], el)
          })
        }
  
        // class management
      , addClass: function (c) {
          c = toString.call(c).split(whitespaceRegex)
          return this.each(function (el) {
            // we `each` here so you can do $el.addClass('foo bar')
            each(c, function (c) {
              if (c && !hasClass(el, setter(el, c)))
                addClass(el, setter(el, c))
            })
          })
        }
  
      , removeClass: function (c) {
          c = toString.call(c).split(whitespaceRegex)
          return this.each(function (el) {
            each(c, function (c) {
              if (c && hasClass(el, setter(el, c)))
                removeClass(el, setter(el, c))
            })
          })
        }
  
      , hasClass: function (c) {
          c = toString.call(c).split(whitespaceRegex)
          return some(this, function (el) {
            return some(c, function (c) {
              return c && hasClass(el, c)
            })
          })
        }
  
      , toggleClass: function (c, condition) {
          c = toString.call(c).split(whitespaceRegex)
          return this.each(function (el) {
            each(c, function (c) {
              if (c) {
                typeof condition !== 'undefined' ?
                  condition ? addClass(el, c) : removeClass(el, c) :
                  hasClass(el, c) ? removeClass(el, c) : addClass(el, c)
              }
            })
          })
        }
  
        // display togglers
      , show: function (type) {
          return this.each(function (el) {
            el.style.display = type || ''
          })
        }
  
      , hide: function () {
          return this.each(function (el) {
            el.style.display = 'none'
          })
        }
  
      , toggle: function (callback, type) {
          this.each(function (el) {
            el.style.display = (el.offsetWidth || el.offsetHeight) ? 'none' : type || ''
          })
          callback && callback()
          return this
        }
  
        // DOM Walkers & getters
      , first: function () {
          return bonzo(this.length ? this[0] : [])
        }
  
      , last: function () {
          return bonzo(this.length ? this[this.length - 1] : [])
        }
  
      , next: function () {
          return this.related('nextSibling')
        }
  
      , previous: function () {
          return this.related('previousSibling')
        }
  
      , parent: function() {
          return this.related(parentNode)
        }
  
      , related: function (method) {
          return this.map(
            function (el) {
              el = el[method]
              while (el && el.nodeType !== 1) {
                el = el[method]
              }
              return el || 0
            },
            function (el) {
              return el
            }
          )
        }
  
        // meh. use with care. the ones in Bean are better
      , focus: function () {
          this.length && this[0].focus()
          return this
        }
  
      , blur: function () {
          return this.each(function (el) {
            el.blur()
          })
        }
  
        // style getter setter & related methods
      , css: function (o, v, p) {
          // is this a request for just getting a style?
          if (v === undefined && typeof o == 'string') {
            // repurpose 'v'
            v = this[0]
            if (!v) {
              return null
            }
            if (v === doc || v === win) {
              p = (v === doc) ? bonzo.doc() : bonzo.viewport()
              return o == 'width' ? p.width : o == 'height' ? p.height : ''
            }
            return (o = styleProperty(o)) ? getStyle(v, o) : null
          }
          var iter = o
          if (typeof o == 'string') {
            iter = {}
            iter[o] = v
          }
  
          if (ie && iter.opacity) {
            // oh this 'ol gamut
            iter.filter = 'alpha(opacity=' + (iter.opacity * 100) + ')'
            // give it layout
            iter.zoom = o.zoom || 1;
            delete iter.opacity;
          }
  
          function fn(el, p, v) {
            for (var k in iter) {
              if (iter.hasOwnProperty(k)) {
                v = iter[k];
                // change "5" to "5px" - unless you're line-height, which is allowed
                (p = styleProperty(k)) && digit.test(v) && !(p in unitless) && (v += px)
                el.style[p] = setter(el, v)
              }
            }
          }
          return this.each(fn)
        }
  
      , offset: function (x, y) {
          if (typeof x == 'number' || typeof y == 'number') {
            return this.each(function (el) {
              xy(el, x, y)
            })
          }
          if (!this[0]) return {
              top: 0
            , left: 0
            , height: 0
            , width: 0
          }
          var el = this[0]
            , width = el.offsetWidth
            , height = el.offsetHeight
            , top = el.offsetTop
            , left = el.offsetLeft
          while (el = el.offsetParent) {
            top = top + el.offsetTop
            left = left + el.offsetLeft
  
            if (el != document.body) {
              top -= el.scrollTop
              left -= el.scrollLeft
            }
          }
  
          return {
              top: top
            , left: left
            , height: height
            , width: width
          }
        }
  
      , dim: function () {
          if (!this.length) return { height: 0, width: 0 }
          var el = this[0]
            , orig = !el.offsetWidth && !el.offsetHeight ?
               // el isn't visible, can't be measured properly, so fix that
               function (t, s) {
                  s = {
                      position: el.style.position || ''
                    , visibility: el.style.visibility || ''
                    , display: el.style.display || ''
                  }
                  t.first().css({
                      position: 'absolute'
                    , visibility: 'hidden'
                    , display: 'block'
                  })
                  return s
                }(this) : null
            , width = el.offsetWidth
            , height = el.offsetHeight
  
          orig && this.first().css(orig)
          return {
              height: height
            , width: width
          }
        }
  
        // attributes are hard. go shopping
      , attr: function (k, v) {
          var el = this[0]
          if (typeof k != 'string' && !(k instanceof String)) {
            for (var n in k) {
              k.hasOwnProperty(n) && this.attr(n, k[n])
            }
            return this
          }
          return typeof v == 'undefined' ?
            !el ? null : specialAttributes.test(k) ?
              stateAttributes.test(k) && typeof el[k] == 'string' ?
                true : el[k] : (k == 'href' || k =='src') && features.hrefExtended ?
                  el[getAttribute](k, 2) : el[getAttribute](k) :
            this.each(function (el) {
              specialAttributes.test(k) ? (el[k] = setter(el, v)) : el[setAttribute](k, setter(el, v))
            })
        }
  
      , removeAttr: function (k) {
          return this.each(function (el) {
            stateAttributes.test(k) ? (el[k] = false) : el.removeAttribute(k)
          })
        }
  
      , val: function (s) {
          return (typeof s == 'string') ?
            this.attr('value', s) :
            this.length ? this[0].value : null
        }
  
        // use with care and knowledge. this data() method uses data attributes on the DOM nodes
        // to do this differently costs a lot more code. c'est la vie
      , data: function (k, v) {
          var el = this[0], uid, o, m
          if (typeof v === 'undefined') {
            if (!el) return null
            o = data(el)
            if (typeof k === 'undefined') {
              each(el.attributes, function(a) {
                (m = ('' + a.name).match(dattr)) && (o[camelize(m[1])] = dataValue(a.value))
              })
              return o
            } else {
              if (typeof o[k] === 'undefined')
                o[k] = dataValue(this.attr('data-' + decamelize(k)))
              return o[k]
            }
          } else {
            return this.each(function (el) { data(el)[k] = v })
          }
        }
  
        // DOM detachment & related
      , remove: function () {
          this.deepEach(clearData)
  
          return this.each(function (el) {
            el[parentNode] && el[parentNode].removeChild(el)
          })
        }
  
      , empty: function () {
          return this.each(function (el) {
            deepEach(el.childNodes, clearData)
  
            while (el.firstChild) {
              el.removeChild(el.firstChild)
            }
          })
        }
  
      , detach: function () {
          return this.map(function (el) {
            return el[parentNode].removeChild(el)
          })
        }
  
        // who uses a mouse anyway? oh right.
      , scrollTop: function (y) {
          return scroll.call(this, null, y, 'y')
        }
  
      , scrollLeft: function (x) {
          return scroll.call(this, x, null, 'x')
        }
  
    }
  
    function normalize(node) {
      return typeof node == 'string' ? bonzo.create(node) : isNode(node) ? [node] : node // assume [nodes]
    }
  
    function scroll(x, y, type) {
      var el = this[0]
      if (!el) return this
      if (x == null && y == null) {
        return (isBody(el) ? getWindowScroll() : { x: el.scrollLeft, y: el.scrollTop })[type]
      }
      if (isBody(el)) {
        win.scrollTo(x, y)
      } else {
        x != null && (el.scrollLeft = x)
        y != null && (el.scrollTop = y)
      }
      return this
    }
  
    function isBody(element) {
      return element === win || (/^(?:body|html)$/i).test(element.tagName)
    }
  
    function getWindowScroll() {
      return { x: win.pageXOffset || html.scrollLeft, y: win.pageYOffset || html.scrollTop }
    }
  
    function bonzo(els, host) {
      return new Bonzo(els, host)
    }
  
    bonzo.setQueryEngine = function (q) {
      query = q;
      delete bonzo.setQueryEngine
    }
  
    bonzo.aug = function (o, target) {
      // for those standalone bonzo users. this love is for you.
      for (var k in o) {
        o.hasOwnProperty(k) && ((target || Bonzo.prototype)[k] = o[k])
      }
    }
  
    bonzo.create = function (node) {
      // hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
      return typeof node == 'string' && node !== '' ?
        function () {
          var tag = /^\s*<([^\s>]+)/.exec(node)
            , el = doc.createElement('div')
            , els = []
            , p = tag ? tagMap[tag[1].toLowerCase()] : null
            , dep = p ? p[2] + 1 : 1
            , ns = p && p[3]
            , pn = parentNode
            , tb = features.autoTbody && p && p[0] == '<table>' && !(/<tbody/i).test(node)
  
          el.innerHTML = p ? (p[0] + node + p[1]) : node
          while (dep--) el = el.firstChild
          // for IE NoScope, we may insert cruft at the begining just to get it to work
          if (ns && el && el.nodeType !== 1) el = el.nextSibling
          do {
            // tbody special case for IE<8, creates tbody on any empty table
            // we don't want it if we're just after a <thead>, <caption>, etc.
            if ((!tag || el.nodeType == 1) && (!tb || el.tagName.toLowerCase() != 'tbody')) {
              els.push(el)
            }
          } while (el = el.nextSibling)
          // IE < 9 gives us a parentNode which messes up insert() check for cloning
          // `dep` > 1 can also cause problems with the insert() check (must do this last)
          each(els, function(el) { el[pn] && el[pn].removeChild(el) })
          return els
  
        }() : isNode(node) ? [node.cloneNode(true)] : []
    }
  
    bonzo.doc = function () {
      var vp = bonzo.viewport()
      return {
          width: Math.max(doc.body.scrollWidth, html.scrollWidth, vp.width)
        , height: Math.max(doc.body.scrollHeight, html.scrollHeight, vp.height)
      }
    }
  
    bonzo.firstChild = function (el) {
      for (var c = el.childNodes, i = 0, j = (c && c.length) || 0, e; i < j; i++) {
        if (c[i].nodeType === 1) e = c[j = i]
      }
      return e
    }
  
    bonzo.viewport = function () {
      return {
          width: ie ? html.clientWidth : self.innerWidth
        , height: ie ? html.clientHeight : self.innerHeight
      }
    }
  
    bonzo.isAncestor = 'compareDocumentPosition' in html ?
      function (container, element) {
        return (container.compareDocumentPosition(element) & 16) == 16
      } : 'contains' in html ?
      function (container, element) {
        return container !== element && container.contains(element);
      } :
      function (container, element) {
        while (element = element[parentNode]) {
          if (element === container) {
            return true
          }
        }
        return false
      }
  
    return bonzo
  }, this); // the only line we care about using a semi-colon. placed here for concatenation tools
  

  provide("bonzo", module.exports);

  (function ($) {
  
    var b = require('bonzo')
    b.setQueryEngine($)
    $.ender(b)
    $.ender(b(), true)
    $.ender({
      create: function (node) {
        return $(b.create(node))
      }
    })
  
    $.id = function (id) {
      return $([document.getElementById(id)])
    }
  
    function indexOf(ar, val) {
      for (var i = 0; i < ar.length; i++) if (ar[i] === val) return i
      return -1
    }
  
    function uniq(ar) {
      var r = [], i = 0, j = 0, k, item, inIt
      for (; item = ar[i]; ++i) {
        inIt = false
        for (k = 0; k < r.length; ++k) {
          if (r[k] === item) {
            inIt = true; break
          }
        }
        if (!inIt) r[j++] = item
      }
      return r
    }
  
    $.ender({
      parents: function (selector, closest) {
        if (!this.length) return this
        var collection = $(selector), j, k, p, r = []
        for (j = 0, k = this.length; j < k; j++) {
          p = this[j]
          while (p = p.parentNode) {
            if (~indexOf(collection, p)) {
              r.push(p)
              if (closest) break;
            }
          }
        }
        return $(uniq(r))
      }
  
    , parent: function() {
        return $(uniq(b(this).parent()))
      }
  
    , closest: function (selector) {
        return this.parents(selector, true)
      }
  
    , first: function () {
        return $(this.length ? this[0] : this)
      }
  
    , last: function () {
        return $(this.length ? this[this.length - 1] : [])
      }
  
    , next: function () {
        return $(b(this).next())
      }
  
    , previous: function () {
        return $(b(this).previous())
      }
  
    , appendTo: function (t) {
        return b(this.selector).appendTo(t, this)
      }
  
    , prependTo: function (t) {
        return b(this.selector).prependTo(t, this)
      }
  
    , insertAfter: function (t) {
        return b(this.selector).insertAfter(t, this)
      }
  
    , insertBefore: function (t) {
        return b(this.selector).insertBefore(t, this)
      }
  
    , siblings: function () {
        var i, l, p, r = []
        for (i = 0, l = this.length; i < l; i++) {
          p = this[i]
          while (p = p.previousSibling) p.nodeType == 1 && r.push(p)
          p = this[i]
          while (p = p.nextSibling) p.nodeType == 1 && r.push(p)
        }
        return $(r)
      }
  
    , children: function () {
        var i, l, el, r = []
        for (i = 0, l = this.length; i < l; i++) {
          if (!(el = b.firstChild(this[i]))) continue;
          r.push(el)
          while (el = el.nextSibling) el.nodeType == 1 && r.push(el)
        }
        return $(uniq(r))
      }
  
    , height: function (v) {
        return dimension.call(this, 'height', v)
      }
  
    , width: function (v) {
        return dimension.call(this, 'width', v)
      }
    }, true)
  
    function dimension(type, v) {
      return typeof v == 'undefined'
        ? b(this).dim()[type]
        : this.css(type, v)
    }
  }(ender));

}());

(function () {

  var module = { exports: {} }, exports = module.exports;

  /*!
    * domready (c) Dustin Diaz 2012 - License MIT
    */
  !function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition()
    else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
    else this[name] = definition()
  }('domready', function (ready) {
  
    var fns = [], fn, f = false
      , doc = document
      , testEl = doc.documentElement
      , hack = testEl.doScroll
      , domContentLoaded = 'DOMContentLoaded'
      , addEventListener = 'addEventListener'
      , onreadystatechange = 'onreadystatechange'
      , readyState = 'readyState'
      , loaded = /^loade|c/.test(doc[readyState])
  
    function flush(f) {
      loaded = 1
      while (f = fns.shift()) f()
    }
  
    doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
      doc.removeEventListener(domContentLoaded, fn, f)
      flush()
    }, f)
  
  
    hack && doc.attachEvent(onreadystatechange, fn = function () {
      if (/^c/.test(doc[readyState])) {
        doc.detachEvent(onreadystatechange, fn)
        flush()
      }
    })
  
    return (ready = hack ?
      function (fn) {
        self != top ?
          loaded ? fn() : fns.push(fn) :
          function () {
            try {
              testEl.doScroll('left')
            } catch (e) {
              return setTimeout(function() { ready(fn) }, 50)
            }
            fn()
          }()
      } :
      function (fn) {
        loaded ? fn() : fns.push(fn)
      })
  })

  provide("domready", module.exports);

  !function ($) {
    var ready = require('domready')
    $.ender({domReady: ready})
    $.ender({
      ready: function (f) {
        ready(f)
        return this
      }
    }, true)
  }(ender);

}());

(function () {

  var module = { exports: {} }, exports = module.exports;

  /*!
    * Qwery - A Blazing Fast query selector engine
    * https://github.com/ded/qwery
    * copyright Dustin Diaz & Jacob Thornton 2011
    * MIT License
    */
  
  (function (name, definition, context) {
    if (typeof module != 'undefined' && module.exports) module.exports = definition()
    else if (typeof context['define'] != 'undefined' && context['define'] == 'function' && context['define']['amd']) define(name, definition)
    else context[name] = definition()
  })('qwery', function () {
    var doc = document
      , html = doc.documentElement
      , byClass = 'getElementsByClassName'
      , byTag = 'getElementsByTagName'
      , qSA = 'querySelectorAll'
      , useNativeQSA = 'useNativeQSA'
      , tagName = 'tagName'
      , nodeType = 'nodeType'
      , select // main select() method, assign later
  
      // OOOOOOOOOOOOH HERE COME THE ESSSXXSSPRESSSIONSSSSSSSS!!!!!
      , id = /#([\w\-]+)/
      , clas = /\.[\w\-]+/g
      , idOnly = /^#([\w\-]+)$/
      , classOnly = /^\.([\w\-]+)$/
      , tagOnly = /^([\w\-]+)$/
      , tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/
      , splittable = /(^|,)\s*[>~+]/
      , normalizr = /^\s+|\s*([,\s\+\~>]|$)\s*/g
      , splitters = /[\s\>\+\~]/
      , splittersMore = /(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\]|[\s\w\+\-]*\))/
      , specialChars = /([.*+?\^=!:${}()|\[\]\/\\])/g
      , simple = /^(\*|[a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/
      , attr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/
      , pseudo = /:([\w\-]+)(\(['"]?([^()]+)['"]?\))?/
      , easy = new RegExp(idOnly.source + '|' + tagOnly.source + '|' + classOnly.source)
      , dividers = new RegExp('(' + splitters.source + ')' + splittersMore.source, 'g')
      , tokenizr = new RegExp(splitters.source + splittersMore.source)
      , chunker = new RegExp(simple.source + '(' + attr.source + ')?' + '(' + pseudo.source + ')?')
      , walker = {
          ' ': function (node) {
            return node && node !== html && node.parentNode
          }
        , '>': function (node, contestant) {
            return node && node.parentNode == contestant.parentNode && node.parentNode
          }
        , '~': function (node) {
            return node && node.previousSibling
          }
        , '+': function (node, contestant, p1, p2) {
            if (!node) return false
            return (p1 = previous(node)) && (p2 = previous(contestant)) && p1 == p2 && p1
          }
        }
  
    function cache() {
      this.c = {}
    }
    cache.prototype = {
      g: function (k) {
        return this.c[k] || undefined
      }
    , s: function (k, v, r) {
        v = r ? new RegExp(v) : v
        return (this.c[k] = v)
      }
    }
  
    var classCache = new cache()
      , cleanCache = new cache()
      , attrCache = new cache()
      , tokenCache = new cache()
  
    function classRegex(c) {
      return classCache.g(c) || classCache.s(c, '(^|\\s+)' + c + '(\\s+|$)', 1)
    }
  
    // not quite as fast as inline loops in older browsers so don't use liberally
    function each(a, fn) {
      var i = 0, l = a.length
      for (; i < l; i++) fn(a[i])
    }
  
    function flatten(ar) {
      for (var r = [], i = 0, l = ar.length; i < l; ++i) arrayLike(ar[i]) ? (r = r.concat(ar[i])) : (r[r.length] = ar[i])
      return r
    }
  
    function arrayify(ar) {
      var i = 0, l = ar.length, r = []
      for (; i < l; i++) r[i] = ar[i]
      return r
    }
  
    function previous(n) {
      while (n = n.previousSibling) if (n[nodeType] == 1) break;
      return n
    }
  
    function q(query) {
      return query.match(chunker)
    }
  
    // called using `this` as element and arguments from regex group results.
    // given => div.hello[title="world"]:foo('bar')
    // div.hello[title="world"]:foo('bar'), div, .hello, [title="world"], title, =, world, :foo('bar'), foo, ('bar'), bar]
    function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value, wholePseudo, pseudo, wholePseudoVal, pseudoVal) {
      var i, m, k, o, classes
      if (this[nodeType] !== 1) return false
      if (tag && tag !== '*' && this[tagName] && this[tagName].toLowerCase() !== tag) return false
      if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) return false
      if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
        for (i = classes.length; i--;) if (!classRegex(classes[i].slice(1)).test(this.className)) return false
      }
      if (pseudo && qwery.pseudos[pseudo] && !qwery.pseudos[pseudo](this, pseudoVal)) return false
      if (wholeAttribute && !value) { // select is just for existance of attrib
        o = this.attributes
        for (k in o) {
          if (Object.prototype.hasOwnProperty.call(o, k) && (o[k].name || k) == attribute) {
            return this
          }
        }
      }
      if (wholeAttribute && !checkAttr(qualifier, getAttr(this, attribute) || '', value)) {
        // select is for attrib equality
        return false
      }
      return this
    }
  
    function clean(s) {
      return cleanCache.g(s) || cleanCache.s(s, s.replace(specialChars, '\\$1'))
    }
  
    function checkAttr(qualify, actual, val) {
      switch (qualify) {
      case '=':
        return actual == val
      case '^=':
        return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, '^' + clean(val), 1))
      case '$=':
        return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, clean(val) + '$', 1))
      case '*=':
        return actual.match(attrCache.g(val) || attrCache.s(val, clean(val), 1))
      case '~=':
        return actual.match(attrCache.g('~=' + val) || attrCache.s('~=' + val, '(?:^|\\s+)' + clean(val) + '(?:\\s+|$)', 1))
      case '|=':
        return actual.match(attrCache.g('|=' + val) || attrCache.s('|=' + val, '^' + clean(val) + '(-|$)', 1))
      }
      return 0
    }
  
    // given a selector, first check for simple cases then collect all base candidate matches and filter
    function _qwery(selector, _root) {
      var r = [], ret = [], i, l, m, token, tag, els, intr, item, root = _root
        , tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
        , dividedTokens = selector.match(dividers)
  
      if (!tokens.length) return r
  
      token = (tokens = tokens.slice(0)).pop() // copy cached tokens, take the last one
      if (tokens.length && (m = tokens[tokens.length - 1].match(idOnly))) root = byId(_root, m[1])
      if (!root) return r
  
      intr = q(token)
      // collect base candidates to filter
      els = root !== _root && root[nodeType] !== 9 && dividedTokens && /^[+~]$/.test(dividedTokens[dividedTokens.length - 1]) ?
        function (r) {
          while (root = root.nextSibling) {
            root[nodeType] == 1 && (intr[1] ? intr[1] == root[tagName].toLowerCase() : 1) && (r[r.length] = root)
          }
          return r
        }([]) :
        root[byTag](intr[1] || '*')
      // filter elements according to the right-most part of the selector
      for (i = 0, l = els.length; i < l; i++) {
        if (item = interpret.apply(els[i], intr)) r[r.length] = item
      }
      if (!tokens.length) return r
  
      // filter further according to the rest of the selector (the left side)
      each(r, function(e) { if (ancestorMatch(e, tokens, dividedTokens)) ret[ret.length] = e })
      return ret
    }
  
    // compare element to a selector
    function is(el, selector, root) {
      if (isNode(selector)) return el == selector
      if (arrayLike(selector)) return !!~flatten(selector).indexOf(el) // if selector is an array, is el a member?
  
      var selectors = selector.split(','), tokens, dividedTokens
      while (selector = selectors.pop()) {
        tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
        dividedTokens = selector.match(dividers)
        tokens = tokens.slice(0) // copy array
        if (interpret.apply(el, q(tokens.pop())) && (!tokens.length || ancestorMatch(el, tokens, dividedTokens, root))) {
          return true
        }
      }
      return false
    }
  
    // given elements matching the right-most part of a selector, filter out any that don't match the rest
    function ancestorMatch(el, tokens, dividedTokens, root) {
      var cand
      // recursively work backwards through the tokens and up the dom, covering all options
      function crawl(e, i, p) {
        while (p = walker[dividedTokens[i]](p, e)) {
          if (isNode(p) && (interpret.apply(p, q(tokens[i])))) {
            if (i) {
              if (cand = crawl(p, i - 1, p)) return cand
            } else return p
          }
        }
      }
      return (cand = crawl(el, tokens.length - 1, el)) && (!root || isAncestor(cand, root))
    }
  
    function isNode(el, t) {
      return el && typeof el === 'object' && (t = el[nodeType]) && (t == 1 || t == 9)
    }
  
    function uniq(ar) {
      var a = [], i, j
      o: for (i = 0; i < ar.length; ++i) {
        for (j = 0; j < a.length; ++j) if (a[j] == ar[i]) continue o
        a[a.length] = ar[i]
      }
      return a
    }
  
    function arrayLike(o) {
      return (typeof o === 'object' && isFinite(o.length))
    }
  
    function normalizeRoot(root) {
      if (!root) return doc
      if (typeof root == 'string') return qwery(root)[0]
      if (!root[nodeType] && arrayLike(root)) return root[0]
      return root
    }
  
    function byId(root, id, el) {
      // if doc, query on it, else query the parent doc or if a detached fragment rewrite the query and run on the fragment
      return root[nodeType] === 9 ? root.getElementById(id) :
        root.ownerDocument &&
          (((el = root.ownerDocument.getElementById(id)) && isAncestor(el, root) && el) ||
            (!isAncestor(root, root.ownerDocument) && select('[id="' + id + '"]', root)[0]))
    }
  
    function qwery(selector, _root) {
      var m, el, root = normalizeRoot(_root)
  
      // easy, fast cases that we can dispatch with simple DOM calls
      if (!root || !selector) return []
      if (selector === window || isNode(selector)) {
        return !_root || (selector !== window && isNode(root) && isAncestor(selector, root)) ? [selector] : []
      }
      if (selector && arrayLike(selector)) return flatten(selector)
      if (m = selector.match(easy)) {
        if (m[1]) return (el = byId(root, m[1])) ? [el] : []
        if (m[2]) return arrayify(root[byTag](m[2]))
        if (hasByClass && m[3]) return arrayify(root[byClass](m[3]))
      }
  
      return select(selector, root)
    }
  
    // where the root is not document and a relationship selector is first we have to
    // do some awkward adjustments to get it to work, even with qSA
    function collectSelector(root, collector) {
      return function(s) {
        var oid, nid
        if (splittable.test(s)) {
          if (root[nodeType] !== 9) {
           // make sure the el has an id, rewrite the query, set root to doc and run it
           if (!(nid = oid = root.getAttribute('id'))) root.setAttribute('id', nid = '__qwerymeupscotty')
           s = '[id="' + nid + '"]' + s // avoid byId and allow us to match context element
           collector(root.parentNode || root, s, true)
           oid || root.removeAttribute('id')
          }
          return;
        }
        s.length && collector(root, s, false)
      }
    }
  
    var isAncestor = 'compareDocumentPosition' in html ?
      function (element, container) {
        return (container.compareDocumentPosition(element) & 16) == 16
      } : 'contains' in html ?
      function (element, container) {
        container = container[nodeType] === 9 || container == window ? html : container
        return container !== element && container.contains(element)
      } :
      function (element, container) {
        while (element = element.parentNode) if (element === container) return 1
        return 0
      }
    , getAttr = function() {
        // detect buggy IE src/href getAttribute() call
        var e = doc.createElement('p')
        return ((e.innerHTML = '<a href="#x">x</a>') && e.firstChild.getAttribute('href') != '#x') ?
          function(e, a) {
            return a === 'class' ? e.className : (a === 'href' || a === 'src') ?
              e.getAttribute(a, 2) : e.getAttribute(a)
          } :
          function(e, a) { return e.getAttribute(a) }
     }()
    , hasByClass = !!doc[byClass]
      // has native qSA support
    , hasQSA = doc.querySelector && doc[qSA]
      // use native qSA
    , selectQSA = function (selector, root) {
        var result = [], ss, e
        try {
          if (root[nodeType] === 9 || !splittable.test(selector)) {
            // most work is done right here, defer to qSA
            return arrayify(root[qSA](selector))
          }
          // special case where we need the services of `collectSelector()`
          each(ss = selector.split(','), collectSelector(root, function(ctx, s) {
            e = ctx[qSA](s)
            if (e.length == 1) result[result.length] = e.item(0)
            else if (e.length) result = result.concat(arrayify(e))
          }))
          return ss.length > 1 && result.length > 1 ? uniq(result) : result
        } catch(ex) { }
        return selectNonNative(selector, root)
      }
      // no native selector support
    , selectNonNative = function (selector, root) {
        var result = [], items, m, i, l, r, ss
        selector = selector.replace(normalizr, '$1')
        if (m = selector.match(tagAndOrClass)) {
          r = classRegex(m[2])
          items = root[byTag](m[1] || '*')
          for (i = 0, l = items.length; i < l; i++) {
            if (r.test(items[i].className)) result[result.length] = items[i]
          }
          return result
        }
        // more complex selector, get `_qwery()` to do the work for us
        each(ss = selector.split(','), collectSelector(root, function(ctx, s, rewrite) {
          r = _qwery(s, ctx)
          for (i = 0, l = r.length; i < l; i++) {
            if (ctx[nodeType] === 9 || rewrite || isAncestor(r[i], root)) result[result.length] = r[i]
          }
        }))
        return ss.length > 1 && result.length > 1 ? uniq(result) : result
      }
    , configure = function (options) {
        // configNativeQSA: use fully-internal selector or native qSA where present
        if (typeof options[useNativeQSA] !== 'undefined')
          select = !options[useNativeQSA] ? selectNonNative : hasQSA ? selectQSA : selectNonNative
      }
  
    configure({ useNativeQSA: true })
  
    qwery.configure = configure
    qwery.uniq = uniq
    qwery.is = is
    qwery.pseudos = {}
  
    return qwery
  }, this);
  

  provide("qwery", module.exports);

  (function ($) {
    var q = require('qwery')
  
    $.pseudos = q.pseudos
  
    $._select = function (s, r) {
      // detect if sibling module 'bonzo' is available at run-time
      // rather than load-time since technically it's not a dependency and
      // can be loaded in any order
      // hence the lazy function re-definition
      return ($._select = (function (b) {
        try {
          b = require('bonzo')
          return function (s, r) {
            return /^\s*</.test(s) ? b.create(s, r) : q(s, r)
          }
        } catch (e) { }
        return q
      })())(s, r)
    }
  
    $.ender({
        find: function (s) {
          var r = [], i, l, j, k, els
          for (i = 0, l = this.length; i < l; i++) {
            els = q(s, this[i])
            for (j = 0, k = els.length; j < k; j++) r.push(els[j])
          }
          return $(q.uniq(r))
        }
      , and: function (s) {
          var plus = $(s)
          for (var i = this.length, j = 0, l = this.length + plus.length; i < l; i++, j++) {
            this[i] = plus[j]
          }
          return this
        }
      , is: function(s, r) {
          var i, l
          for (i = 0, l = this.length; i < l; i++) {
            if (q.is(this[i], s, r)) {
              return true
            }
          }
          return false
        }
    }, true)
  }(ender));
  

}());

