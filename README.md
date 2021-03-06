# ender-overlay
-----

Ender-overlay is a highly configurable overlay plugin for [Ender](http://ender.no.de). You can easily build your
own gallery or other overlay based logic on the top of this plugin. It's just **2.1 KByte** (minified and gzipped).

It requires [Jeesh](https://github.com/ender-js/jeesh) and [Morpheus](https://github.com/ded/morpheus) for animations.
Even though, you can leave Morpheus out if you are fine without animations. Currently it's tested in Chrome, Firefox, Safari, Opera and IE7+. You can report bugs [here](https://github.com/nemeseri/ender-overlay/issues).

If you want to use ***CSS3 transitions*** instead of JS animations, just set the "css3transition" property to true. It will only work if the animationIn or animationOut property are not "none". Only recent Firefox and Webkit based browsers will use transitions, older browsers will fall back to JS animations (if morpheus is available).

Moreover, it's even compatible with jQuery and Zepto! So if you want to include it in a jQuery/Zepto based project, you can do it without any extra work.

You might be interested in [ender-carousel](https://github.com/nemeseri/ender-carousel), which is a simple carousel plugin for Ender.

I got a lot inspiration from [jQuery Tools](http://flowplayer.org/tools/), thanks for that.

More information, documentation, demos: [http://nemeseri.com/ender-overlay/](http://nemeseri.com/ender-overlay/)