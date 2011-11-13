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
		var self = this,
			overlayWidth;
			
		this.options = {
			top: "100px",
			position: "absolute",
			cssClass: "ender-overlay",
			zIndex: 9999,
			showMask: true,
			closeOnEsc: true,
			closeOnMaskClick: true,
			autoOpen: false,
			
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
		};
		extend(this.options, settings || {});

		this.$overlay = el.addClass(this.options.cssClass)
							.appendTo("body");

		overlayWidth = this.$overlay.width();

		this.$overlay.css({
			position: this.options.position,
			top: this.options.top,
			left: "50%",
			zIndex: this.options.zIndex,
			marginLeft: overlayWidth / 2 * -1
		});

		if (this.options.showMask) {
			// If there is no explicit duration set for OverlayCover
			// set it from overlay animation
			if (! this.options.mask.durationIn) 
				this.options.mask.durationIn = this.options.animationIn.duration;
			
			if (! this.options.mask.durationOut) 
				this.options.mask.durationOut = this.options.animationOut.duration;

			this.cover = new OverlayMask(this.options.mask);
		}

		// prevent multiple event binding
		if (! this.$overlay.attr("data-overlayloaded")) {
			this.$overlay.find(".close").click(function () {
				self.close();
			});

			if (this.options.closeOnEsc) {
				$(document).keyup(function (e) {
					self.onKeyUp(e);
				});
			}

			if (this.cover && this.options.closeOnMaskClick) {
				this.cover.getMask().click(function () {
					self.close();
				});
			}
			this.$overlay.attr("data-overlayloaded", 1);
		}

		if (this.options.autoOpen) {
			this.open();
		}
	}

	Overlay.prototype.open = function () {
		if (this.options.onBeforeOpen(this.$overlay) === false) {
			return;
		}

		if (this.$overlay.animate) {
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

		if (this.cover) {
			this.cover.show();
		}
	};
	
	Overlay.prototype.close = function () {
		if (this.options.onBeforeClose(this.$overlay) === false) {
			return;
		}

		if (this.$overlay.animate) {
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

		if (this.cover) {
			this.cover.hide();
		}
	};
	
	Overlay.prototype.onKeyUp = function (e) {
		if (e.keyCode === 27
			&& this.$overlay.css("display") !== "none") {
			this.close();
		}
	};
	
	function OverlayMask (settings) {
		this.options = {
			id: "ender-overlay-mask",
			zIndex: 9998,
			opacity: 0.6,
			color: "#777"
		};
		extend(this.options, settings || {});

		var $cover = $("#" + this.options.id);
		
		if (! $cover.length) {
			$cover = $("<div></div>")
				.attr("id", this.options.id)
				.css({
					display: "none",
					position: "absolute",
					top: 0,
					left: 0
				})
				.appendTo("body");
		}

		this.$cover = $cover;
	}
	
	OverlayMask.prototype.show = function () {
		// apply instance mask options
		var opt = this.options;

		this.$cover.css({
			zIndex: opt.zIndex,
			backgroundColor: opt.color,
			width: $(document).width(),
			height: $(document).height()
		});

		if (this.$cover.animate) {
			this.$cover.css({
				opacity: 0,
				display: "block"
			}).animate({
				opacity: opt.opacity,
				duration: opt.durationIn
			});
		} else {
			this.$cover.css({
				display: "block",
				opacity: opt.opacity
			});
		}
	};
	
	OverlayMask.prototype.hide = function () {
		if (this.$cover.animate) {
			var self = this;
			this.$cover.animate({
				opacity: 0,
				duration: this.options.durationOut,
				complete: function () {
					self.$cover.css({
						display: "none"
					});
				}
			});
		} else {
			this.$cover.css({
				display: "none"
			});
		}
	};
	
	OverlayMask.prototype.getMask = function () {
		return this.$cover;
	};
	
	$.ender({
		overlay: function (options) {
			var el = $(this).first();
			return new Overlay(el, options);
		}
	}, true);
}(ender);