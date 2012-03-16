/*!
  * Ender-Overlay: Simple Overlay for Ender
  * copyright Andras Nemeseri @nemeseri 2011 | License MIT
  * https://github.com/nemeseri/ender-overlay
  */
(function ($) {
	var is,
		transition;

	// from valentine
	is = {
		fun: function (f) {
			return typeof f === 'function';
		},
		arr: function (ar) {
			return ar instanceof Array;
		},
		obj: function (o) {
			return o instanceof Object && !is.fun(o) && !is.arr(o);
		}
	};

	/*
		Based on Bootstrap
		Mozilla and Webkit support only
	*/
    transition = (function () {
		var st = document.createElement("div").style,
			transitionEnd = "TransitionEnd",
			transitionProp = "Transition",
			support = st.transition !== undefined ||
				st.WebkitTransition !== undefined ||
				st.MozTransition !== undefined;

		return support && {
			prop: (function () {
				if (st.WebkitTransition !== undefined) {
					transitionProp = "WebkitTransition";
				} else if (st.MozTransition !== undefined) {
					transitionProp = "MozTransition";
				}
				return transitionProp;
			}()),
			end: (function () {
				if (st.WebkitTransition !== undefined) {
					transitionEnd = "webkitTransitionEnd";
				} else if (st.MozTransition !== undefined) {
					transitionEnd = "transitionend";
				}
				return transitionEnd;
			}())
		};
	}());

	function extend() {
		// based on jQuery deep merge
		var options, name, src, copy, clone,
			target = arguments[0], i = 1, length = arguments.length;

		for (; i < length; i += 1) {
			if ((options = arguments[i]) !== null) {
				// Extend the base object
				for (name in options) {
					src = target[name];
					copy = options[name];
					if (target === copy) {
						continue;
					}
					if (copy && (is.obj(copy))) {
						clone = src && is.obj(src) ? src : {};
						target[name] = extend(clone, copy);
					} else if (copy !== undefined) {
						target[name] = copy;
					}
				}
			}
		}
		return target;
	}

	function clone(obj) {
		if (null === obj || "object" !== typeof obj) {
			return obj;
		}
		var copy = obj.constructor(),
			attr;
		for (attr in obj) {
			if (obj.hasOwnProperty(attr)) {
				copy[attr] = obj[attr];
			}
		}
		return copy;
	}

	// from jquery
	function proxy(fn, context) {
		var slice = Array.prototype.slice,
			args = slice.call(arguments, 2);
		return function () {
			return fn.apply(context, args.concat(slice.call(arguments)));
		};
	}

	function animate(el, animationSettings, css3transition) {
		var duration = animationSettings.duration,
			easing = animationSettings.easing,
			complete = animationSettings.complete ? animationSettings.complete : function () {},
			dummy;

		if (css3transition && transition) {
			// css3 transitions instead of JS animation
			dummy = el[0].offsetWidth; // force reflow; source: bootstrap
			el[0].style[transition.prop] = "all " + animationSettings.duration + "ms";

			// takaritas
			// valamiert lefut azonnal a complete fgv enelkul..
			delete animationSettings.complete;
			delete animationSettings.duration;
			delete animationSettings.easing;

			el.css(animationSettings);
			el.unbind(transition.end);
			el.bind(transition.end, complete);
		} else if (window.ender) {
			// use morpheus
			el.animate(animationSettings);
		} else {
			// use animate from jquery
			el.animate(animationSettings, duration, easing, complete);
		}
	}

	/*
		OverlayMask Constructor
	*/
	function OverlayMask(settings) {
		this.init(settings);
	}

	OverlayMask.prototype = {
		init: function (options) {
			this.options = {
				id: "ender-overlay-mask",
				zIndex: 9998,
				opacity: 0.6,
				color: "#777"
			};

			extend(this.options, options || {});

			var $mask = $("#" + this.options.id);

			if (! $mask.length) {
				$mask = $("<div></div>")
					.attr("id", this.options.id)
					.css({
						display: "none",
						position: "absolute",
						top: 0,
						left: 0
					})
					.appendTo("body");
			}

			if (this.options.animation && ! $mask.animate) {
				this.options.animation = false;
			}

			this.$mask = $mask;
		},

		show: function () {
			// apply instance mask options
			var opt = this.options,
				docSize = this.getDocSize();

			this.$mask.css({
				zIndex: opt.zIndex,
				backgroundColor: opt.color,
				width: docSize.width,
				height: docSize.height
			});

			if (opt.animation) {
				this.$mask.css({
					opacity: 0.01, // ie quirk
					display: "block"
				});
				animate(this.$mask, {
					opacity: opt.opacity,
					duration: opt.durationIn
				}, opt.css3transition);
			} else {
				this.$mask.css({
					display: "block",
					opacity: opt.opacity
				});
			}
		},

		hide: function () {
			var opt = this.options,
				self = this;

			if (opt.animation) {
				animate(this.$mask, {
					opacity: 0,
					duration: this.options.durationOut,
					complete: function () {
						self.$mask.css({
							display: "none"
						});
					}
				}, opt.css3transition);
			} else {
				this.$mask.css({
					display: "none"
				});
			}
		},

		getDocSize: function () {
			if (window.ender) { // ender
				return {
					width: $("body").width(),
					height: $.doc().height
				};
			} else { // jquery
				return {
					width: $(document).width(),
					height: $(document).height()
				};
			}
		},

		getMask: function () {
			return this.$mask;
		}
	};

	/*
		Overlay Constructor
	*/
	function Overlay(el, settings) {
		this.init(el, settings);

		// only return the API
		// instead of this
		return this.getApi();
	}

	Overlay.prototype = {
		init: function ($el, options) {
			this.options = {
				top: 80,
				position: "absolute",
				cssClass: "ender-overlay",
				close: ".close",
				trigger: null,
				zIndex: 9999,
				showMask: true,
				closeOnEsc: true,
				closeOnMaskClick: true,
				autoOpen: false,
				allowMultipleDisplay: false,

				// morpheus required for JS fallback
				animation: true,
				css3transition: true, // beta
				// start values before animation
				startAnimationCss: {
					opacity: 0.01 // ie quirk
				},

				// morpheus animation options
				animationIn: {
					opacity: 1,
					duration: 250
				},

				animationOut: {
					opacity: 0,
					duration: 250
				},

				mask: {},

				onBeforeOpen: function () {},
				onBeforeClose: function () {},
				onOpen: function () {},
				onClose: function () {}
			};

			this.setOptions(options);
			this.$overlay = $el;

			if (this.options.showMask) {
				this.initMask();
			}

			// prevent multiple event binding
			if (! this.$overlay.attr("data-overlayloaded")) {
				this.attachEvents();
				this.$overlay.attr("data-overlayloaded", 1);
			}

			if (this.options.animation && ! $el.animate) {
				this.options.animation = false;
			}

			if (this.options.autoOpen) {
				this.open();
			}
		},

		attachEvents: function () {
			var self = this,
				opt = this.options;

			// Bind open method to trigger's click event
			if (opt.trigger && $(opt.trigger).length) {
				$(opt.trigger).click(function (e) {
					e.preventDefault();
					self.open();
				});
			}

			this.$overlay
				.delegate(opt.close, 'click', function (e) {
					e.preventDefault();
					self.close();
				});

			// attach event listeners
			$(document).bind("ender-overlay.close", function () {
				self.close();
			});

			$(document).bind("ender-overlay.closeOverlay", function () {
				self.close(true);
			});

			if (opt.closeOnEsc) {
				$(document).keyup(function (e) {
					self.onKeyUp(e);
				});
			}

			if (this.mask && opt.closeOnMaskClick) {
				this.mask.getMask().click(function () {
					self.close();
				});
			}
		},

		initMask: function () {
			// If there is no explicit duration set for OverlayMask
			// set it from overlay animation
			if (! this.options.mask.durationIn) {
				this.options.mask.durationIn = this.options.animationIn.duration;
			}

			if (! this.options.mask.durationOut) {
				this.options.mask.durationOut = this.options.animationOut.duration;
			}

			if (typeof this.options.mask.animation !== "boolean") {
				this.options.mask.animation = this.options.animation;
			}

			if (typeof this.options.mask.css3transition !== "boolean") {
				this.options.mask.css3transition = this.options.css3transition;
			}

			this.mask = new OverlayMask(this.options.mask);
		},

		setupOverlay: function () {
			var opt = this.options,
				topPos = opt.top,
				scrollTop = $(window).scrollTop(),
				overlayWidth = this.$overlay.width();

			// setup overlay
			this.$overlay
				.addClass(opt.cssClass)
				.appendTo("body");

			if (opt.position === "absolute") {
				topPos += scrollTop;
			}

			// width is not defined explicitly
			// so we try to find out
			if (overlayWidth === 0) {
				this.$overlay.css({
					display: "block",
					position: "absolute",
					left: -9999
				});
				overlayWidth = this.$overlay.width();
			}

			this.$overlay.css({
				display: "none",
				position: opt.position,
				top: topPos,
				left: "50%",
				zIndex: opt.zIndex,
				marginLeft: overlayWidth / 2 * -1
			});
		},

		open: function (dontOpenMask) {
			var opt = this.options,
				self = this,
				animationIn = clone(opt.animationIn),
				api = this.getApi();

			if (this.$overlay.css("display") === "block" ||
				opt.onBeforeOpen(api) === false) {
				return;
			}

			this.setupOverlay();

			if (! opt.allowMultipleDisplay) {
				$(document).trigger("ender-overlay.closeOverlay");
			}

			if (opt.animation) {
				if (opt.startAnimationCss.opacity === 0) {
					opt.startAnimationCss.opacity = 0.01; // ie quirk
				}

				this.$overlay.css(
					extend({display: "block"}, opt.startAnimationCss)
				);

				animate(
					this.$overlay,
					extend(animationIn, {
						complete: function () {
							if (animationIn.opacity === 1) {
								self.$overlay.css({ "filter": "" }); // ie quirk
							}
							self.options.onOpen(api);
						}
					}),
					opt.css3transition
				);
			} else {
				this.$overlay.css({
					display: "block"
				});
				opt.onOpen();
			}

			if (this.mask &&
				typeof dontOpenMask === "undefined") {
				this.mask.show();
			}
		},

		close: function (dontHideMask) {
			var opt = this.options,
				self = this,
				animationOut,
				api = this.getApi();

			if (opt.onBeforeClose(api) === false ||
				this.$overlay.css("display") !== "block") {
				return;
			}

			if (opt.animation) {
				animationOut = clone(opt.animationOut);

				animate(
					this.$overlay,
					extend(animationOut, {
						complete: function () {
							self.$overlay.css({display: "none"});
							self.options.onClose(api);
						}
					}),
					opt.css3transition
				);
			} else {
				this.$overlay.css({
					display: "none"
				});
				opt.onClose(api);
			}

			if (this.mask &&
				typeof dontHideMask === "undefined") {
				this.mask.hide();
			}
		},

		onKeyUp: function (e) {
			if (e.keyCode === 27 &&
				this.$overlay.css("display") !== "none") {
				this.close();
			}
		},

		getOverlay: function () {
			return this.$overlay;
		},

		getOptions: function () {
			return this.options;
		},

		setOptions: function (options) {
			extend(this.options, options || {});
		},

		getApi: function () {
			return {
				open: proxy(this.open, this),
				close: proxy(this.close, this),
				getOverlay: proxy(this.getOverlay, this),
				getOptions: proxy(this.getOptions, this),
				setOptions: proxy(this.setOptions, this)
			};
		}
	};

	$.fn.overlay = function (options) {
		var el = $(this).first();
		return new Overlay(el, options);
	};

}(window.ender || window.jQuery));