/**
  * Ender-Overlay: Simple Overlay for Ender
  * copyright Andras Nemeseri @nemeseri 2011 | License MIT
  * https://github.com/nemeseri/ender-overlay
  */
!function ($) {
	// from valentine
	var is = {
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

	function extend () {
		// based on jQuery deep merge
		var options, name, src, copy, clone, 
			target = arguments[0], i = 1, length = arguments.length;

		for (; i < length; i++) {
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
	
	function clone (obj) {
		if (null == obj || "object" != typeof obj) return obj;
		var copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
		}
		return copy;
	}
	
	function Overlay (el, settings) {
		this.init(el, settings);
	}

	Overlay.prototype = {
		options: {
			top: "100px",
			position: "absolute",
			cssClass: "ender-overlay",
			closeSelector: ".close",
			zIndex: 9999,
			showMask: true,
			closeOnEsc: true,
			closeOnMaskClick: true,
			autoOpen: false,

			// morpheus required
			animation: true,
			// start values before animation
			startAnimationCss: {
				opacity: 0
			},

			// morpheus animation options
			animationIn: {
				opacity: 1,
				duration: 200
			},

			animationOut: {
				opacity: 0,
				duration: 200
			},

			mask: {},

			onBeforeOpen: function () {},
			onBeforeClose: function () {},
			onOpen: function () {},
			onClose: function () {}
		},
		
		init: function ($el, options) {
			extend(this.options, options || {});

			// setup overlay
			this.$overlay = $el.addClass(this.options.cssClass)
								.appendTo("body");

			this.$overlay.css({
				position: this.options.position,
				top: this.options.top,
				left: "50%",
				zIndex: this.options.zIndex,
				marginLeft: this.$overlay.width() / 2 * -1
			});

			if (this.options.showMask) {
				this.initMask();
			}

			// prevent multiple event binding
			if (! this.$overlay.attr("data-overlayloaded")) {
				this.attachEvents();
				this.$overlay.attr("data-overlayloaded", 1);
			}

			if (this.options.animation && ! $el.animate)
				this.options.animation = false;

			if (this.options.autoOpen) {
				this.open();
			}
		},
		
		attachEvents: function () {
			var self = this;

			this.$overlay
				.find(this.options.closeSelector)
				.click(function () {
					self.close();
				});

			// attach event listeners
			$(document).bind("ender-overlay.close", function () {
				self.close();
			});
			
			$(document).bind("ender-overlay.closeOverlay", function () {
				self.close(true);
			});

			if (this.options.closeOnEsc) {
				$(document).keyup(function (e) {
					self.onKeyUp(e);
				});
			}

			if (this.mask && this.options.closeOnMaskClick) {
				this.mask.getMask().click(function () {
					self.close();
				});
			}
		},
		
		initMask: function () {
			// If there is no explicit duration set for OverlayMask
			// set it from overlay animation
			if (! this.options.mask.durationIn) 
				this.options.mask.durationIn = this.options.animationIn.duration;

			if (! this.options.mask.durationOut) 
				this.options.mask.durationOut = this.options.animationOut.duration;

			if (typeof this.options.mask.animation !== "boolean")
				this.options.mask.animation = this.options.animation;

			this.mask = new OverlayMask(this.options.mask);
		},
		
		open: function (dontOpenMask) {
			if (this.options.onBeforeOpen(this.$overlay) === false) {
				return;
			}

			if (this.options.animation) {
				var self = this,
					animationIn = clone(this.options.animationIn);

				this.$overlay.css(
					extend({display: "block"}, this.options.startAnimationCss)
				);

				this.$overlay.animate(
					extend(animationIn, {
						complete: function () {
							self.options.onOpen(self.$overlay);
						}
					})
				);
			} else {
				this.$overlay.css({
					display: "block"
				});
				this.options.onOpen(this.$overlay);
			}

			if (this.mask && 
				typeof dontOpenMask === "undefined") {
				this.mask.show();
			}
		},

		close: function (dontHideMask) {
			if (this.options.onBeforeClose(this.$overlay) === false) {
				return;
			}

			if (this.options.animation) {
				var self = this,
					animationOut = clone(this.options.animationOut);

				this.$overlay.animate(
					extend(animationOut, {
						complete: function () {
							self.$overlay.css({display: "none"});
							self.options.onClose(self.$overlay);
						}
					})
				);
			} else {
				this.$overlay.css({
					display: "none"
				});
				this.options.onClose(this.$overlay);
			}

			if (this.mask && 
				typeof dontHideMask === "undefined") {
				this.mask.hide();
			}
		},

		onKeyUp: function (e) {
			if (e.keyCode === 27
				&& this.$overlay.css("display") !== "none") {
				this.close();
			}
		}
	};

	function OverlayMask (settings) {
		this.init(settings);
	}
	
	OverlayMask.prototype = {
		options: {
			id: "ender-overlay-mask",
			zIndex: 9998,
			opacity: 0.6,
			color: "#777",
			animation: true // morpheus required
		},
		
		init: function (options) {
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

			if (this.options.animation && ! $mask.animate)
				this.options.animation = false;

			this.$mask = $mask;
		},
		
		show: function () {
			// apply instance mask options
			var opt = this.options;

			this.$mask.css({
				zIndex: opt.zIndex,
				backgroundColor: opt.color,
				width: $(document).width(),
				height: $(document).height()
			});

			if (this.options.animation) {
				this.$mask.css({
					opacity: 0,
					display: "block"
				}).animate({
					opacity: opt.opacity,
					duration: opt.durationIn
				});
			} else {
				this.$mask.css({
					display: "block",
					opacity: opt.opacity
				});
			}
		},

		hide: function () {
			if (this.options.animation) {
				var self = this;
				this.$mask.animate({
					opacity: 0,
					duration: this.options.durationOut,
					complete: function () {
						self.$mask.css({
							display: "none"
						});
					}
				});
			} else {
				this.$mask.css({
					display: "none"
				});
			}
		},

		getMask: function () {
			return this.$mask;
		}
	};
	
	$.ender({
		overlay: function (options) {
			var el = $(this).first();
			return new Overlay(el, options);
		}
	}, true);
}(ender);