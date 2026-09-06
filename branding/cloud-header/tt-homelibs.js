var _____WB$wombat$assign$function_____=function(name){return (globalThis._wb_wombat && globalThis._wb_wombat.local_init && globalThis._wb_wombat.local_init(name))||globalThis[name];};if(!globalThis.__WB_pmw){globalThis.__WB_pmw=function(obj){this.__WB_source=obj;return this;}}{
let window = _____WB$wombat$assign$function_____("window");
let self = _____WB$wombat$assign$function_____("self");
let document = _____WB$wombat$assign$function_____("document");
let location = _____WB$wombat$assign$function_____("location");
let top = _____WB$wombat$assign$function_____("top");
let parent = _____WB$wombat$assign$function_____("parent");
let frames = _____WB$wombat$assign$function_____("frames");
let opener = _____WB$wombat$assign$function_____("opener");
var SKY = SKY || {};
SKY.header = SKY.header || {};

(function($,NS){

    var characters = {};

    var headerContainer = null;
    var wishlist = [];
    var onTop = true;
    var $window = null;
    var $content = null;
    var newCookie = 0;
    var headerNav = null;
    var browserWidth = 0;
    var wishlistData = {};
    var navMoving = false;
    var whatsNewContentTile = null;
    var navImgWidth = 0;
    var whatsNewIndex = 0;
    var menuTimeout = null;
    var isMouseOver = false;
    var relativeTop = -160;
    var contentMargin = 10;

//some constants    
    var characterJSON = "/content/atvi/skylanders/base/web/en/data/json/wishlist-json.js";
//    var characterJSON = "/content/atvi/skylanders/base/web/en/data/json/characters-json.js";
    var newJSON = "/content/atvi/skylanders/base/web/en/hidden/header-menu/whats-new/jcr:content.json";
    var whatsNewJSON = "/content/atvi/skylanders/base/web/en/data/json/whats-new-json.js";
    var scrollThreshold = 100;
    var wishlistDisplayMax = 3;
    var isIE9 = navigator.userAgent.match(/MSIE [0-9]/);
    var xhrMax = 3;
    var xhrCount = 0;

    isIE9 = isIE9 instanceof Array && isIE9.length > 0 ? (parseInt((isIE9[0].split(' ')[1]),10) < 10 ? true : false) : false;

    var init = function(){

        headerNav = $('#HeaderCollapsibleNav');
        headerContainer = $('body > .header-container');
        $window = $(window);
        $content = $('body > .container');
        whatsNewContentTile = headerNav.find('#whatsNewNav .contentTile .contentTile');

        var $whatsNewClose = $("<div class='wn-close'/>").prependTo(headerNav.find("#whatsNewNav > .content-tile > .atvi-content-tile > .contentTile"));
        $whatsNewClose.on('click', offWhatsNew);

        var navItems = headerContainer.find('.header-nav-item, .home-nav-item');
        var subNavItems = headerNav.find('.parCanvas > .section > *')

		headerNav.insertAfter(headerContainer);
        headerNav.on('animationEnd',onAnimEndClose);
        headerNav.on('webkitAnimationEnd',onAnimEndClose);
        headerNav.on('mouseenter',onTopMenu);
        headerNav.on('mouseleave',offTopMenu);

        var eachNav = function(idx,el){
            var navItem = $(el).parent();

            navItem.on('mouseenter',onTopMenu);
            navItem.on('mouseleave',offTopMenu);
//            navItem.on('touchstart',onclickTopMenu);
//            navItem.on('touchmove',ontouchmoveNav);
//            navItem.on('touchend',ontouchendTopMenu);
            navItem.on('click',onclickTopMenu);

            if(!(el instanceof HTMLParagraphElement)) {
                var id = parseInt(el.id.replace(/sky-main-nav-link-/ig,''), 10);
                id = el.className.match(/header-nav-item/) ? id-3 : id;
				var parent = subNavItems[id].parentNode;
				cloneSubNav(parent, navItem, '.imgTitle', '.atvi-instrument-image');
            }
        }

        $window.on('scroll', onscrollWindow);
        $window.on('resize',onresizeVWFix);

        $.ajax(characterJSON, {
            success: createWishlist
        });

        $.ajax(newJSON, {
            success: newContent
        });

        $.ajax(whatsNewJSON, {
            success: updateNewContent
        })

        headerNav.find('#games2Nav img').each(outputImageTitle);
        headerNav.find('#minigamesNav img').each(outputImageTitle);
        headerNav.find('#charactersNav img').each(outputImageTitle);
        headerNav.find('#helpNav img').each(outputImageTitle);
        headerNav.find('#wishlistNavToutWrapper').parent().hide();

        if(NS.mobilenav && NS.mobilenav.init)
            NS.mobilenav.init(true, mobileTouchCB);

        navItems.each(eachNav);

    };

    var onresizeVWFix = function() {
        var element = document.body.id === 'explore-skylands' ? document.body : headerNav[0];
        var disp = element.style.display;
        element.style.display = 'none';
        var trick = element.offsetHeight;
        element.style.display = disp;
    };

    var cloneSubNav = function(src, dest, textClass, linkClass){
		var items = $(src)[0].querySelectorAll(linkClass);

        if(items.length > 0){
            var container = document.createElement('div');
    
            for(var i=0, l=items.length; i<l; ++i){
                var selector = items[i].querySelector(textClass);

                if(selector && selector.innerText && selector.innerText.length && selector.innerText.length > 0){
                    var link = document.createElement('a');
                    var content = document.createElement('div');

                    link.href = items[i].href;
                    link.className = linkClass.match(/[a-zA-Z0-9\-\_]+/ig).join('_') + "-link";
                    content.className = linkClass.match(/[a-zA-Z0-9\-\_]+/ig).join('_') + "-content";
                    content.innerText = selector.innerText;

                    link.appendChild(content);

                    container.appendChild(link);
                }
            }

            container.className = "linkContainer";

            $(dest)[0].appendChild(container);
        }
    }

    var parseCharacters = function(data){
        for(var k in data){
            for(var j in data[k]){
                for(var i=0, l=data[k][j].length; i<l; ++i){
                    characters[data[k][j][i].displayName.toLowerCase().replace(/\s/ig,'-')] = data[k][j][i];
                }
            }
        }//*/

/*        for(var i=0, l=data.length; i<l; ++i){
            characters[data[i].characterName] = data[i];
        }//*/

    };

    var newContent = function(data){
        var time = new Date(data["cq:lastModified"]).getTime();

        if(time > (parseInt(ATVI.utils.getCookie('whats-new'),10) || 0)){
            var header = headerContainer.find('#WhatsNewHeader');

            header.addClass('alert');
            header.trigger('mouseenter');
            //$content.addClass('drop');
        }

        ATVI.utils.setCookie('whats-new', time, new Date(new Date().getTime()+31536000));

        ++xhrCount;
        if(xhrCount >= xhrMax) {
            xhrPromise();
        }

    };

    var updateNewContent = function(data){
        var txtimgs = headerNav.find('#whatsNewNav .contentTile > .textimage'),
		j = 0,
		l = txtimgs.length;/*data.hits.length*/
        data = typeof data === "string" ? JSON.parse(data) : data;

        for(var i = 0; i < l; ++i){
            /*if(data.hits[i].title.match(/textimage/ig)){*/
				var createdate = "createdate_"+j;
                var timestamp = (data[0] || data)[createdate].split(' ')[0].split('-');
                var created = timestamp[1]+'.'+timestamp[2]+'.'+timestamp[0];
                $(txtimgs[j]).find('.ti-text').prepend('<div class="timestamp">'+created+'</div>');
				++j;
           /* }*/
        }

        var selector = headerNav[0].querySelector('#whatsNewMobileSelect');

        if(j > 0) {
            for(var i = 0; i < j; ++i){
                var dot = document.createElement('div');
                dot.id = "whatsNewMobilePageDot"+i;
                dot.className = "whatsNewMobilePageDot";
                dot.addEventListener('click', ontouchMobilePageNav, false);
                selector.appendChild(dot);
            }

            var dotStyle = getComputedStyle(dot);
            var navImgStyle = getComputedStyle(txtimgs[0]);

            var dotWidth = parseInt(dotStyle.width,10)+parseInt(dotStyle.marginLeft,10)+parseInt(dotStyle.marginRight,10);
            navImgWidth = parseInt(navImgStyle.width,10)+parseInt(navImgStyle.marginLeft,10)+parseInt(navImgStyle.marginRight,10);

            dotWidth = isNaN(dotWidth) ? 40 : dotWidth;
            navImgWidth = isNaN(navImgWidth) ? 150 : navImgWidth;

            txtimgs[0].parentNode.style.setProperty('width',(navImgWidth * j)+'px');
            selector.style.setProperty('width', (dotWidth * j)+'px');
            selector.querySelector('#whatsNewMobilePageDot0').className += ' selected';
        }

		++xhrCount;
        if(xhrCount >= xhrMax) {
            xhrPromise();
        }
    };

    var createWishlist = function(data){

        data = data || wishlistData;
        data = typeof data === "string" ? JSON.parse(data) : data;
//        var items = ATVI.utils.getCookie('skywishlist') ? ATVI.utils.getCookie('skywishlist').replace(/^,/,'').split(',') : [];
        var items = SKY.wishlist.get();
        var wlistWrapper = headerNav.find('#wishlistNavToutWrapper');
        var wlist = wlistWrapper.find('#wishlistNavTouts');
        var wlistEmpty = headerNav.find('#wishlistNavEmpty');
        wlistEmpty.parent().hide();
        wlistWrapper.parent().hide();

        var l = items.length;
        var valid = 0;

        if(l !== 0) {
            parseCharacters(data);

            for(var i = 0; i < l && valid < wishlistDisplayMax; i++) {
                var char = characters[items[i]];
                if(!char) continue;
                valid++;
                var tout = $('<a class="wishlistTout ' + char.element + '">');
                tout.attr('href',char.pagePath);
                tout.append($('<a href="' + char.path + '" class="wishlistToutImgWrapper"><img src="' + char.card + '" class="wishlistToutImg"></a>'));
                tout.append($('<div class="element"></div>'));
                tout.append($('<div class="wishlistToutLabel">'+char.displayName.replace(/(lightcore|series [0-9]+)/ig,'')+'</div>'));          
                tout.appendTo(wlist);
            }
        }

        if(valid > 0) {
            $('.header-container a.wishlist-nav-item').parent().append(
                $('<div class="wishlist-count-wrapper"><div class="wishlist-count">'+items.length+'</div></div>')
            );

            wlistWrapper.parent().fadeOut(500,function(){
                wlistWrapper.parent().show(500);
            });

        } else {
            wlistEmpty.parent().show();
        }

        if(!wishlistData) {
            ++xhrCount;
            if(xhrCount >= xhrMax) {
                xhrPromise();
            }

            wishlistData = data;
        }
    };

    var xhrPromise = function() {
        ATVI.analytics.setupLinks(headerNav);
    }
	
    var ontouchMobilePageNav = function(e) {
        var target = e.target || e.srcElement;
        var newpos = parseInt(target.id.replace('whatsNewMobilePageDot',''),10);

        whatsNewContentTile.css('-webkit-transform','translate3d(-'+(newpos*navImgWidth)+'px,0,0)');
        whatsNewContentTile.css('transform','translate3d(-'+(newpos*navImgWidth)+'px,0,0)');

        headerNav.find('.whatsNewMobilePageDot').removeClass('selected');
        headerNav.find('#whatsNewMobilePageDot'+newpos).addClass('selected');
    }

    var onclickTopMenu = function(e) {
//        e.preventDefault();
//        e.stopPropagation();
        navMoving = false;
    };

    var onTopMenu = function(e) {
        e.stopPropagation();

        var state = headerNav[0].hasAttribute('state') ? headerNav.attr('state') : false;
        var target = $(e.target || e.srcElement)[0];
        var newState = textToClass(target);

        if(isMouseOver){
            headerContainer.find('#WhatsNewHeader').removeClass('alert');
        }else
            isMouseOver = true;

        if(newState){
            headerNav.attr('state', newState);
			if(newState == "help") $("#HelpHeader").addClass("active");
			if(newState == "whatsNew") headerContainer.find('#WhatsNewHeader').addClass('alert');
            headerNav.find('> .parCanvas > .section').hide();
            headerNav.find('#'+newState+'Nav').parent().show();
        }
        headerNav.removeClass('close')

        if(!headerNav.hasClass('open'))
            headerNav.addClass('open');

    };

    var offTopMenu = function(e) {
        e.stopPropagation();

        if(isIE9){
			headerNav.removeClass('open');
            headerNav.removeClass('close');
        }else{
	        isMouseOver = false;

            setTimeout(function(){
                if(!isMouseOver){
                    headerNav.removeClass('open');
                    headerNav.addClass('close');
					$("#HelpHeader").removeClass("active");
					headerContainer.find('#WhatsNewHeader').removeClass('alert');
                }
            },300);
        }
    };

    var offWhatsNew = function() {
		headerNav.removeClass('open');
        headerNav.addClass('close');
    }

    var ontouchmoveNav = function(e) {
        navMoving = true;
    }

    var ontouchendTopMenu = function(e) {
        e.preventDefault();
        e.stopPropagation();

        if(navMoving === false){

            var state = headerNav[0].hasAttribute('state') ? headerNav.attr('state') : false;
            var target = $(e.target || e.srcElement).parents('li');
            var newState = textToClass(target);

            headerContainer.find('.header-navigation li').removeClass('clicked');

            if(headerNav.hasClass('open') && state === newState){
				if(state == "whatsNew") headerNav.removeClass('open');
                offTopMenu(e);
            }else{
                if(state === newState) {
					if(state == "whatsNew") headerNav.removeClass('open');
                    offTopMenu(e);
				}
				onTopMenu(e);
                target.addClass('clicked');

                isMouseOver = true;
            }

            console.log(e.target);
            if(typeof e.target.href === 'string' && e.target.href.length > 0)
                location = e.target.href;
        }

		navMoving = false;
    }


    var mobileTouchCB = function(){
		 if(headerNav.hasClass('open'))
			headerNav.removeClass('open');

    }

    var onAnimEndClose = function(e){
		if(headerNav.hasClass('close'))       
	        headerNav.removeClass('close');
    }

    var onscrollWindow = function(e) {

        if($window.innerWidth() > 767){
            if($window.scrollTop() > scrollThreshold){
                onTop = false;
    
                if(!$(document.body).hasClass('scrolling')){
                    $(document.body).addClass('scrolling');
                }
    
            }else{
                onTop = true;
    
                if($(document.body).hasClass('scrolling')){
                    $(document.body).removeClass('scrolling');
                }
            }
        }

    }

    var textToClass = function(el){
//        debugger;
        var $el = el.id && el.id.length > 0 ? $(el) : $(el).parent();
        var txt = $el.text();
        var out = txt.toLowerCase().replace(/[\s\u25BC]+/ig,"");
        var wlCount = $el.find('.wishlist-count-wrapper');

        if(wlCount.length > 0)
            out = out.replace(wlCount.text(),'');

        switch(out){
        case 'games':
			out = 'games2';
			break;

        case 'minigames':
			out = 'minigames';
			break;

		case 'characters':
			out = 'characters';
            break;

		case 'wishlist':
			out = 'wishlist';
            break;

		case "what'snew":
		case 'new':
			out = 'whatsNew';
            break;

		case 'help':
		case '?':
			out = 'help';
            break;

		default:
            out = false;
            break;
        }//*/


        if($el.hasClass('video-games-nav-item')){
			out = 'games2';
        }else if($el.hasClass('minigames-nav-item')){
            out = 'minigames';
        }else if($el.hasClass('characters-nav-item')){
            out = 'characters';
        }else if($el.hasClass('wishlist-nav-item')){
            out = 'wishlist';
        }else if($el.hasClass('help-nav-item') || out === 'help' || out === '?'){
            out = 'help';
        }else if($el[0].id === 'WhatsNewHeader' || $el[0].className === 'WhatsNewHeaderWrapper'){
            out = 'whatsNew';
        }

        return out;
    }

    var setHeaderNav = function(el){
        var state = textToClass(el);
        var obj = {};

        obj.top = contentMargin;
        obj.opacity = 1;

        return obj;
    } 

    var onloadImage = function(e){
        var parent = $(e.target || e.srcElement).parent();
        parent.hide();
        parent.css('visibility', 'visible');
        parent.fadeIn(500);
    }

    var outputImageTitle = function(idx,el){
		var $el = $(el);
        $el.parent().append($('<div class="imgTitle">'+el.title+'</div>'));
    }

    var prependImageTitle = function(idx,el){
		var $el = $(el);
        $el.parent().prepend($('<div class="imgTitle">'+el.title+'</div>'));
    }

    NS.header.init = init;
    NS.header.onresizeVWFix = onresizeVWFix;
    NS.header.updateWishlist = createWishlist;

})(jQuery, SKY);
 
/*
 * jquery.requestAnimationFrame
 * https://github.com/gnarf37/jquery-requestAnimationFrame
 * Requires jQuery 1.8+
 *
 * Copyright (c) 2012 Corey Frang
 * Licensed under the MIT license.
 */

(function( $ ) {

    // requestAnimationFrame polyfill adapted from Erik Möller
    // fixes from Paul Irish and Tino Zijdel
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

    // updated by Benito Crawford to fix background pause

    var animating,
        lastTime = 0,
        vendors = ['webkit', 'moz'],
        requestAnimationFrame = window.requestAnimationFrame,
        cancelAnimationFrame = window.cancelAnimationFrame,
        backgroundTimeout;

    for(; lastTime < vendors.length && !requestAnimationFrame; lastTime++) {
        requestAnimationFrame = window[ vendors[lastTime] + "RequestAnimationFrame" ];
        cancelAnimationFrame = cancelAnimationFrame ||
            window[ vendors[lastTime] + "CancelAnimationFrame" ] || 
            window[ vendors[lastTime] + "CancelRequestAnimationFrame" ];
    }

    var raf = function() {
        if (animating) {
            resetBackgroundTimeout();
            requestAnimationFrame(raf);
            jQuery.fx.tick();
        }
    };

    var resetBackgroundTimeout = function() {
        if(backgroundTimeout) {
            clearTimeout(backgroundTimeout);
            backgroundTimeout = null;
        }
        backgroundTimeout = setTimeout(raf, 70);
    };

    if ( requestAnimationFrame ) {
        // use rAF
        window.requestAnimationFrame = requestAnimationFrame;
        window.cancelAnimationFrame = cancelAnimationFrame;
        jQuery.fx.timer = function( timer ) {
            if ( timer() && jQuery.timers.push( timer ) && !animating ) {
                animating = true;
                raf();
            }
        };

        jQuery.fx.stop = function() {
            animating = false;
        };
    } else {
        // polyfill
        window.requestAnimationFrame = function( callback, element ) {
            var currTime = new Date().getTime(),
                timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) ),
                id = window.setTimeout( function() {
                    callback( currTime + timeToCall );
                }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;
        };

        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }

}(jQuery));

var SKY = SKY || {};
SKY.mobilenav = SKY.mobilenav || {};

(function($, SKY) {

	SKY.mobilenav = SKY.mobilenav || {};
	
	var $header, $pagev1, $pagev2, $footer, $navMenu, $langMenu, $navCollapsible, $body;

    var init = function() {

		$header = $("body > .header-container");
		$body = $("body");
		$pagev1 = $("body > .container");
		$pagev2 = $("body > .page-content-container");
		$footer = $("body > .footer-container");
		$navMenu = $(".header-navigation");
		$langMenu = $(".header .language-selector .atvi-language-selector .locale-menu.overlap, .header .atvi-locale-selector .locale-menu .locale-list");
		$navCollapsible = $('#HeaderCollapsibleNav');
		
        setupMobileNavToggle();
		setupMobileLangToggle();
		onResize();

    };
	
	var setupMobileLangToggle = function(e) {
		
		$header.find('.language-selector').add($header.find('.atvi-locale-selector')).click(function() {
			
			if(window.innerWidth > 768) return;
			
			if($navCollapsible.hasClass('open'))
				$navCollapsible.addClass('close');
	
			$navCollapsible.removeClass('open');

			if($body.hasClass("langActive")) {

				if($pagev1.length) $pagev1.animate({left : "0%"}, 1000);
				if($pagev2.length) $pagev2.animate({left : "0%"}, 1000);
				$footer.animate({left : "0%"}, 1000);
				$langMenu.animate({right : "-80%"}, 1000);
				$header.animate({left : "0%"}, 1000,function() {
					if($body.hasClass("langActive")) $body.removeClass("langActive");
					else $body.addClass("langActive");
				});
			} else {

				if($pagev1.length) $pagev1.animate({left : "-80%"}, 1000);
				if($pagev2.length) $pagev2.animate({left : "-80%"}, 1000);
				$footer.animate({left : "-80%"}, 1000);
				$langMenu.animate({right : "0%"}, 1000);
				$header.animate({left : "-80%"}, 1000,function() {
					if($body.hasClass("langActive")) $body.removeClass("langActive");
					else $body.addClass("langActive");
				});
			}
		});
    };
	
	var setupMobileNavToggle = function(e) {

		var $menuToggle = $(".header .refHeaderContent > .text");
		
		$menuToggle.click(function() {
			if($navCollapsible.hasClass('open'))
            	$navCollapsible.addClass('close');

			$navCollapsible.removeClass('open');

			if($body.hasClass("navActive")) {
				if($pagev1.length) $pagev1.animate({left : "0%"}, 1000);
				if($pagev2.length) $pagev2.animate({left : "0%"}, 1000);
				$footer.animate({left : "0%"}, 1000);
				$navMenu.animate({left : "-80%"}, 1000);
				$header.animate({left : "0%"}, 1000,function() {
					if($body.hasClass("navActive")) $body.removeClass("navActive");
					else $body.addClass("navActive");
				});
			} else {
				if($pagev1.length) $pagev1.animate({left : "80%"}, 1000);
				if($pagev2.length) $pagev2.animate({left : "80%"}, 1000);
				$footer.animate({left : "80%"}, 1000);
				$navMenu.animate({left : "0%"}, 1000);
				$header.animate({left : "80%"}, 1000,function() {
					if($body.hasClass("navActive")) $body.removeClass("navActive");
					else $body.addClass("navActive");
				});
			}
		});
    };

    var onResize = function(widthState) {
        $(window).resize(function() {
			if(window.innerWidth > 767) {
				$body.removeClass("langActive, navActive");
				$header.add($pagev1).add($pagev2).add($footer).add($body).add($navMenu).add($langMenu).attr("style", "");
			}
		});
    };

    SKY.mobilenav.init = init;


})(jQuery, SKY);

 
var SKY = SKY || {};
SKY.resize = SKY.resize || {};

(function($, SKY) {

	var $window, handlers = [], breakpointHandlers = [];

    var init = function() {
		$window = $(window);
        SKY.resize.lastWidth = $window.width();
        SKY.resize.lastHeight = $window.height();
        SKY.resize.widthState = getWidthState();

        $window.resize(function() {
			var w = $window.width();
            var h = $window.height();
            if(w != SKY.resize.lastWidth || h != SKY.resize.lastHeight) {
                SKY.resize.lastWidth = w;
                SKY.resize.lastHeight = h;
				var newState = getWidthState();

                if(newState != SKY.resize.widthState) {
					SKY.resize.widthState = newState;
                    runBreakpointHandlers();
                }
                runHandlers();
            }
        });
    };

    var getWidthState = function() {
        var ws, lw = SKY.resize.lastWidth;
		if(lw <= 767) ws = 2;
        else if(lw <= 1023) ws = 4;
		else if(lw <= 1479) ws = 6;
		else ws = 8;
        return ws;
    };

    var runHandlers = function() {
        for(var i = 0; i < handlers.length; i++) {
			handlers[i](SKY.resize.lastWidth, SKY.resize.lastHeight);
        }
    };

    var runBreakpointHandlers = function() {
        for(var i = 0; i < breakpointHandlers.length; i++) {
			breakpointHandlers[i](SKY.resize.widthState, SKY.resize.lastWidth, SKY.resize.lastHeight);
        }
    }

    SKY.resize.registerResizeHandler = function(callback, runFirst) {
		handlers.push(callback);
        if(runFirst) {
            $(function() {
            	callback(SKY.resize.lastWidth, SKY.resize.lastHeight);
        	});
        }
    };

    SKY.resize.registerBreakpointHandler = function(callback, runFirst) {
		breakpointHandlers.push(callback);
        if(runFirst) {
            $(function() {
            	callback(SKY.resize.widthState, SKY.resize.lastWidth, SKY.resize.lastHeight);
        	});
        }
    };

    $(init);

})(jQuery, SKY);

var SKY = SKY || {};
SKY.core = SKY.core || {};



(function($, SKY) {



    // patch console.log for safety's sake
    if(!window.console) window.console = {
        log: function() {}
    };

    // "preload"
    if(ATVI.components.langSelect) {
        ATVI.components.langSelect.afterLinkUpdate = function(context) {
            //context.localeList.find(".RU a").attr("href", "/ru");
            context.localeList.find(".PL a").attr("href", "/pl");
            context.localeList.find(".JP a").attr("href", "/jp");
        };
    }

    var init = function() {
    	//console.log("RUN SKYLANDERS HUB!");
        loadGlobalScripts();
        //SKY.resize.registerBreakpointHandler(reorderFooterElements, true);
        loadFooterLogos();
        copyFooterElements();
        if(ATVI.browser) {
            SKY.core.device = ATVI.browser.isMobile || ATVI.browser.isTablet;
            SKY.core.isMoble = ATVI.browser.isMobile;
            SKY.core.isTouch = ATVI.browser.isTouch;
        } else {
            SKY.core.device = ATVI.device.isMobile.any();
            SKY.core.isMobile = SKY.core.device && (SKY.core.device != "iPad");
        	SKY.core.isTouch = "ontouchstart" in document.documentElement;
        }

    };


    var loadGlobalScripts = function() {
		if($("#sky-atlas-mobile-carousel").length > 0) SKY.atlasmobile.init();
        if(SKY.header && SKY.header.init)
            SKY.header.init();
        else
            SKY.mobilenav.init();
    };
    var loadFooterLogos = function() {
        var pathname = window.location.pathname;

        if(pathname.indexOf("en_ca") > -1 || pathname.indexOf("ca/en") > -1 || pathname.indexOf("en") > -1 || pathname.indexOf("fr_ca") > -1 || pathname.indexOf("ca/fr") > -1){

            $(".footer #sky-footer #footer-container-3 li.esrb-link-0 a img").attr("src","/content/dam/atvi/global/ratings/esrb/privacy_certified_kids_color.gif");
			$(".footer #sky-footer #footer-container-3 li.esrb-link-0 a").attr("href","https://web.archive.org/web/20141001085455/http://www.esrb.org/confirm/activision-confirmation.jsp");
			$( ".footer #sky-footer #footer-container-3" ).css( "width","210px");

        }
        else{

            $(".footer #sky-footer #footer-container-3 li.esrb-link-0 a img").attr("src","/content/dam/atvi/global/ratings/esrb/privacy_certified_kids_color.gif");
			$(".footer #sky-footer #footer-container-3 li.esrb-link-0 a").attr("href","https://web.archive.org/web/20141001085455/http://www.esrb.org/confirm/activision-confirmation.jsp");
			$( ".footer #sky-footer #footer-container-3" ).css( "width","210px");

        }


    };


    var copyFooterElements = function() {
		var desktopEsrbLogos = $("#sky-footer-esrb");
		var desktopSupportLinks = $("#sky-footer-support-links");
		var mobileEsrbLogos = $('<div id="sky-mobile-esrb" class="footer-esrb clearfix">');
		mobileEsrbLogos.html(desktopEsrbLogos.html()).appendTo($("#footer-container-1"));
	    var mobileSupportLinks = $('<div id="sky-mobile-support-links" class="footer-support-links clearfix">');
		mobileSupportLinks.html(desktopSupportLinks.html()).appendTo($(".header .header-navigation"));

        ATVI.analytics.setupClickHandlers(mobileSupportLinks);
		ATVI.analytics.setupClickHandlers(mobileEsrbLogos);

    };

    var makeReadyQueue = function(arr, alwaysAfter) {
        var ready = false;
        var queue = [];
        var onReady = function(callback) {
            if(ready) {
				if(alwaysAfter) setTimeout(callback, 0);
                else callback();
            }
            else queue.push(callback);
        };
        
        var events = arr.slice(0);
        
        var processQueue = function() {
            while(queue.length) queue.shift()();
        };
        
        var trigger = function(ev) {
            for(var i = 0; i < events.length; i++) {
                if(events[i] == ev) {
                    events.splice(i, 1);
                    break;
                }
            }
            if(!events.length) {
                ready = true;
                processQueue();
            }
        };
        
        return {
            on: onReady,
            trigger: trigger,
            get: function() { return events.slice(0); }
        };
    };

    var makeMetaReadyQueue = function(arr, alwaysAfter) {
		var i, evs = [];
        for(i = 0; i < arr.length; i++)
            evs.push("e" + i);
		var ret = makeReadyQueue(evs, alwaysAfter);
        for(i = 0; i < arr.length; i++) {
            (function(i) {
                arr[i].on(function() {
                    ret.trigger("e" + i);
                });
            })(i);
        }
		return ret;
    };

	var $spinnerContainer, $spinnerOverlay, $spinner, $spinnerLogo, bufferTime = 500;
    var spinnerLoaded, overlaying, spinning, animating, sheepDummy, sheepShadowOpacity;
	var overlayQueue = [], spinnerQueue = [];
    var removeQueue, callbacks = [];

    var setupSpinner = function(overlayEvents, spinnerEvents, callback) {
		$spinnerContainer = $("#spinner-container").appendTo($("body")).hide();
        $spinnerOverlay = $spinnerContainer.find(".overlay");
		$spinner = $spinnerContainer.find(".spinner");
        $spinner.parent().css("visibility", "hidden");
        sheepShadowOpacity = parseFloat($spinner.find(".sheep-shadow").css("opacity"));
		spinnerLoaded = SKY.core.makeReadyQueue(["loaded"], true);
        $spinnerLogo = $spinnerContainer.find(".logo");

        if(callback) callbacks.push(callback);

        if(overlayEvents) overlayQueue = overlayEvents;
        if(spinnerEvents) spinnerQueue = spinnerEvents;

        if(overlayQueue.length) {
            overlaying = true;
            $spinnerContainer.show();
            $spinnerOverlay.show();
            setTimeout(function() {
                spinnerLoaded.on(function() {
                    if(spinning || overlaying) {
                        $spinner.show();
                        startAnimation();
                    }
                });
            }, 400);
        };
        if(spinnerQueue.length) {
            spinnerLoaded.on(function() {
                $spinner.show();
            });
            spinning = true;
            startAnimation();
        }

        var spinnerOpts = {
            doHeadRequest: false,
            maxTime: 10000,
            onLoadComplete: function() {
                $spinner.parent().css("visibility", "visible");
				spinnerLoaded.trigger("loaded");
        	}
        };
    	SKY.images.preload($spinner, spinnerOpts);

    	var logoOpts = {
            doHeadRequest: false,
            maxTime: 40000,
            onLoadComplete: function() {
				$spinnerLogo.fadeIn();
        	}
        };
    	SKY.images.preload($spinnerLogo, logoOpts);

    };

    var addToOverlayQueue = function(event, callback) {
        if(callback) callbacks.push(callback);
		overlayQueue.push(event);
        updateDisplay();
    };

    var removeFromOverlayQueue = function(event, callback) {
        if(callback) callbacks.push(callback);
		var doIt = function() {
            removeItem(overlayQueue, event);
            updateDisplay();
        };
        if(removeQueue) removeQueue.on(doIt);
        else doIt();
    };

    var addToSpinnerQueue = function(event, callback) {
		if(callback) callbacks.push(callback);
		spinnerQueue.push(event);
        updateDisplay();
    };

    var removeFromSpinnerQueue = function(event, callback) {
        if(callback) callbacks.push(callback);
		var doIt = function() {
            removeItem(spinnerQueue, event);
            updateDisplay();
        };
        if(removeQueue) removeQueue.on(doIt);
        else doIt();
    };

    var removeItem = function(a, e) {
		var i = a.indexOf(e);
        if(i != -1) {
			a.splice(i, 1);
        };
    };

    var setBufferTime = function(t) {
		bufferTime = t;
    };

    var updateDisplay = function() {
		var newOverlaying = overlayQueue.length > 0;
        var newSpinning = spinnerQueue.length > 0;
        if(newOverlaying != overlaying) {
			if(newOverlaying) {
                $spinnerOverlay.stop(true).delay(bufferTime).queue(function() {
					$spinnerContainer.show();
                    $spinnerOverlay.dequeue();
                }).fadeTo(500, 1);
            } else {
				$spinnerOverlay.stop(true).fadeTo(500, 0);
            }
        }
        if((newSpinning || newOverlaying) != (spinning || overlaying)) {
			if(newSpinning || newOverlaying) {
                spinnerLoaded.on(function() {
                    if(spinning || overlaying) {
                        $spinner.stop(true).delay(bufferTime).queue(function() {
                            $spinnerContainer.show();
                            startAnimation();
                            $spinner.dequeue();
                    	}).fadeTo(500, 1);
                    }
                });
            } else {
                runCallbacks();
                $spinner.stop(true).fadeTo(500, 0, function() {
                    stopAnimation();
                    $spinnerContainer.hide();
                });
            }
        }
        spinning = newSpinning;
        overlaying = newOverlaying;
    };

    var runCallbacks = function() {
		while(callbacks.length) callbacks.shift()();
    };

    var startAnimation = function() {
        if(animating) return;
        animating = true;

        removeQueue = SKY.core.makeReadyQueue(["timeOut"]);
        setTimeout(function() {
			removeQueue.trigger("timeOut");
        }, 3000);

        var sheep = $spinner.find(".sheep");
        var sheepShadow = $spinner.find(".sheep-shadow");
        if(!sheepDummy) sheepDummy = $('<div>');
		sheepDummy.css("left", 0);

        var minHopHeight, timeScale;

        var hop = function(start, end) {

            var hopDist = Math.abs(start - end);
			var hopHeight = hopDist * .3;
            if(hopHeight < minHopHeight) hopHeight = minHopHeight;
            var duration = Math.sqrt(hopHeight) * 60 / timeScale;

            sheepDummy.queue(function() {
				sheepDummy.css("left", 0);
                sheep.removeClass("squish");
                sheepDummy.dequeue();
            });

            sheepDummy.animate({left: 1}, {
                duration: duration,
                easing: "linear",
                step: function(x) {
					//var x = parseFloat(sheepDummy.css("left"));
                    var l = start + (end - start) * x;
                    var x2 = 2 * x - 1;
                    var h = (x2 * x2 - 1) * hopHeight;
                    sheep.css({ left: l, "margin-top": h });
                    sheepShadow.css({left: l - h * .3, opacity: sheepShadowOpacity * (1 + h * .01)});
                },
                done: function() {
                    sheep.css({left: end, "margin-top": 0}).addClass("squish");
                    sheepShadow.css({left: end, opacity: sheepShadowOpacity});
                }
            });


        };

        var turn = function(direction) {
            sheepDummy.queue(function() {
                if(direction > 0) {
                    sheep.removeClass("reversed");
                    sheepShadow.removeClass("reversed");
                }
                else {
                    sheep.addClass("reversed");
                    sheepShadow.addClass("reversed");
                }
                sheepDummy.dequeue();
            });
        };

        var cycle = function() {
            var sheepWidth = sheep.width();
            var startLeft = Math.round(sheepWidth * .8);
            var spinnerWidth = $spinner.width();
			var farLeft = Math.round(spinnerWidth - sheepWidth * 1.8);
            var width = farLeft - startLeft;
            var x1 = startLeft + width * (.4 + .2 * Math.random());
            var x3 = farLeft - width * (.35 + .13 * Math.random());
            var x4 = x3 - width * (.35 + .14 * Math.random());

            minHopHeight = width / 12;
            timeScale = width / 260;

            sheep.css("left", startLeft);
            sheepShadow.css("left", startLeft);
            turn(1);
			sheepDummy.delay(1000);
            hop(startLeft, x1);
			sheepDummy.delay(600);
			hop(x1, farLeft);
			sheepDummy.delay(800);
            turn(-1);
			sheepDummy.delay(1000);
			hop(farLeft, x3);
			sheepDummy.delay(600);
			hop(x3, x4);
			sheepDummy.delay(600);
			hop(x4, startLeft);
			sheepDummy.delay(800);
            sheepDummy.queue(function() {
				cycle();
                sheepDummy.dequeue();
            });
        };

        cycle();
    };

    var stopAnimation = function() {
        if(!animating) return;
		animating = false;
        if(sheepDummy) sheepDummy.stop(true);
    };

    var loadAppModal = {
        init : function() {
            if ($(".locale-entry.selected").hasClass("US") && !document.cookie.match("modalSeen")) {
				var self = this;
                var modalContainer  = "#sky-app-modal-wrapper";
                var modalContent = ".modal-content";

                self.buildModal();
                self.setModalHandlers();

                $(modalContainer).show()
                $("#sky-app-modal-wrapper img").load( function() {
                    var conCenter = $("#sky-app-modal-wrapper").height() / 2;
                    var elCenter = $("#sky-app-modal-wrapper .modal-content").height() / 2;

                    $("#sky-app-modal-wrapper .modal-content").css({ "top" : conCenter, "margin-top" : -elCenter});
                });

                $(window).resize(function(){
                    var conCenter = $("#sky-app-modal-wrapper").height() / 2;
                    var elCenter = $("#sky-app-modal-wrapper .modal-content").height() / 2;
                    
                    $("#sky-app-modal-wrapper .modal-content").css({ "top" : conCenter, "margin-top" : -elCenter});
                });

                ATVI.analytics.setupClickHandlers($("#sky-app-modal-container"));
            }
        },

        buildModal : function () {
            var $modalContainer = $("<div/>", {"id" : "sky-app-modal-container"});
            var $modalWrapper = $("<div/>", { "id" : "sky-app-modal-wrapper", "class" : "atvi-instrument atvi-instrument-SCV-pop-up-background"});
            var $modalContent = $("<div/>", { "class" : "modal-content" });
            var $modalImg = $("<img/>", { src : "/content/dam/atvi/skylanders/base/home/modal/collectionVaultBackground.png" });

            var $appLink = $("<a/>", { 
                "id" : "SCV-pop-up-link",
                "class" : "app-store-link",
                "target" : "_blank",
                href : "https://web.archive.org/web/20141001085455/https://control.kochava.com/v1/cpi/click?campaign_id=koskylanderscollectionvault11295239be42dc9b1824e28d57025c&network_id=357&device_id=device_id&site_id=home_greeting"
            });

            var $modalClose = $("<div/>", { "class" : "modal-close atvi-instrument atvi-instrument-SCV-pop-up-close-btn"}).append("<p style='text-indent: -9999px;'>Close</p>");

            $modalContent.append($modalImg, $appLink, $modalClose);
            $modalWrapper.append($modalContent);
            $modalContainer.append($modalWrapper);
            $("body").append($modalContainer);
        },
        
        calculateVerticalCenter : function (container, element, addToElHeight) {
            var conCenter = $(container).height() / 2;
            var elCenter = ($(element).height() + addToElHeight) / 2;
            
            $(element).css({ "top" : conCenter, "margin-top" : -elCenter});
            
        },
        
        setModalHandlers : function() {
            $("#sky-app-modal-wrapper, #sky-app-modal-wrapper .modal-close").click(
                function() {
                    var date = new Date();
                    date.setDate(date.getDate() + 7);
                    var cookieValue = "modalSeen=true; expire=" + date.toGMTString() + "; path=/;";
                    document.cookie = cookieValue;
                    $("#sky-app-modal-wrapper").hide();
                }).children().click( 
                	function(e) { 
                        if(e.target.className != "app-store-link")
                        	return false; 
                    } 
            	);
        }
    }

	SKY.core.init = init;
	SKY.core.makeReadyQueue = makeReadyQueue;
    SKY.core.makeMetaReadyQueue = makeMetaReadyQueue;
    SKY.core.spinner = {
        setup: setupSpinner,
        addToOverlayQueue: addToOverlayQueue,
        removeFromOverlayQueue: removeFromOverlayQueue,
		addToSpinnerQueue: addToSpinnerQueue,
        removeFromSpinnerQueue: removeFromSpinnerQueue,
        setBufferTime: setBufferTime
    };




})(jQuery, SKY);







var ATVI = ATVI || {};
ATVI.analytics = ATVI.analytics || {};


ATVI.analytics.setupTaggedElements = (function($) {
    return function(root) {
        var self = this;
        
        root.find(".atvi-instrument").click(function() {
            var classes = this.className.split(/\s+/);
            var className, child;
            
            for(i in classes) {
                if(classes[i].indexOf("atvi-instrument-") == 0) {
                    className = classes[i];
                    className = className.substring("atvi-instrument-".length);
                    break;
                }
            }

            if(className) {

                var $this = $(this);

                var parentclass = this.parentNode.className.match(/(header-navigation-link|header-subnav-link|preorder|mobile-entry-download)/);
                var thisclass = this.className.match(/(preorder|roundabout)/);

                className = this.className.match(/-image/) ? ( parentclass ? parentclass[0].replace(/\s/g,'') : className ) : ( thisclass ? thisclass[0].replace(/\s/g,'') : className);

                var id = this.id || "";
                id = id.replace(/^(.+)-analytics-suffix-.*$/, "$1");

                var data = {
                        action_type: className,
                        action_details: id,
                        ns_type: "hidden"
                };


                var e = arguments[0];
                var raParent = $(e.target || e.srcElement).parents('.roundabout-holder');

                if(className === 'image' && raParent.length > 0) {
                    className = 'roundabout';
                }

                //console.log(className,this);

                if(className.indexOf("preorder-button-") == 0) {
                    data.action_type = "preorder-button";
                    var form = $this.parents(".atvi-pre-order");
                    var regionSelect = form.find(".region-select");
                    var bundle = $this.parents(".bundle-info-container");
                    var retailerSelect = bundle.find(".retailer-select");
                    var selectedPlatform = form.find(".platform-list .selected");
                    var platform = "";
                    if(selectedPlatform.hasClass("platform-xbox")) {
                        platform = "xbox";
                    } else if(selectedPlatform.hasClass("platform-ps3")) {
                        platform = "ps3";
                    } else if(selectedPlatform.hasClass("platform-pc")) {
                        platform = "pc";
                    } else {
                        platform = selectedPlatform.text();
                    }
                    
                    data.purchase_region = regionSelect.val();
                    data.purchase_partner = retailerSelect.val();
                    data.purchase_platform = "generic";
                    //data.purchase_product = className.substring("preorder-button-".length);
                    var productId = $(this).attr("id");
                    data.purchase_product = productId.substring(0,productId.length - "-container-default".length);
                }
                
                if(className.indexOf("wheretobuy-button-") == 0) {
                    data.action_type = "preorder-button";
                    var form = $this.parents(".atvi-wheretobuy");
                    var regionSelect = form.find(".region-select");
                    var bundle = $this.parents(".bundle-info-container");
                    var retailerSelect = bundle.find(".retailer-select");
                    var selectedPlatform = form.find(".platform-list .selected");
                    var platform = "";
                    if(selectedPlatform.hasClass("platform-xbox")) {
                        platform = "xbox";
                    } else if(selectedPlatform.hasClass("platform-ps3")) {
                        platform = "ps3";
                    } else if(selectedPlatform.hasClass("platform-pc")) {
                        platform = "pc";
                    } else {
                        platform = selectedPlatform.text();
                    }
                    
                    data.purchase_region = regionSelect.val();
                    data.purchase_partner = retailerSelect.val();
                    data.purchase_platform = platform;
                    data.purchase_product = className.substring("wheretobuy-button-".length);
                }

                switch(className) {

                case "image":
                    child = $this.find("img");
                    if(child.length) {
                        child = $(child[0]);
                        data.action_details += ":" + child.attr("src");
                    }
                    if ($(this).attr("id").indexOf("app-store") > 0) {
						var gameName = id.replace(/^(og|apps)-(.+)-app-store-image-link$/, "$2");
                        data.action_details = gameName;
                        data.action_type = "app_store_clickthrough";
                    }
                    break;
				case "header-navigation-link":
                    if ($this.text().trim().length > 0)
                        data.action_details += ":" + $this.text().trim();
                    break;
				case "header-subnav-link":
					var parent = $this.parent();
                    var classes = parent[0].className.replace(/atvi-[a-zA-Z]+\s/ig,'');
                    data.action_type = "navigation_click";
					data.action_details = "global-nav-"+classes.replace('header-subnav-link ','').replace(/\s+/ig,'-');
					break;
                case "navigation_clickthrough":
                    var fromHash = SKY.characters.processHash($this.attr("href"));
                    data.action_details = (fromHash.game || "") + "." + (fromHash.elementClass || "");
                    data.result_details = (fromHash.game || SKY.characters.getCurrentGame()) +
                        					"." + (fromHash.elementClass || SKY.characters.getCurrentElementClass());
                    break;                        
				case "open_game":
                    var gamePath = $(this).attr("href");
            		var index = gamePath.lastIndexOf("/") + 1;
					var filename = gamePath.substr(index);
           			var selectedGame = filename.replace(".swf", "");
                    SKY.onlinegames.lastSelectedGame = selectedGame;
                    data.action_details = $(this).text().toLowerCase().replace(" ","_");
                    data.skylanders_game = selectedGame;
                    break;
                case "close_game":
                    data.action_details = $this.text().toLowerCase();
                    data.skylanders_game = SKY.onlinegames.lastSelectedGame;
                    break;
                case "play_video":
                    data.action_details = SKY.home.getSwapCarouselState().combo;
//                     data.action_details = location.href.match(/characters\/[^.]+./ig)[0].replace(/(characters\/|\.)/ig,'');  
                    break;
                case "preorder":
                    data.action_type = "preorder-now";
                    data.action_details = "preorder-now";
                    break;
                case "roundabout":
					var detail = $('#new-characters-tile .character-info > h2').text();
                    data.action_type = "play_video";
					data.action_details = detail;
					break;
				case "mobile-entry-download":
					var store = this.href.match(/(apple|google|amazon)/);
					if(store.length > 0){
                        data.action_type = "app_store_click";
                      	data.action_details = "trapteam."+store[0];
                    }
					break;
                }

                
                self.sendData(data);
            }
        });
    };
})(jQuery);


var SKY = SKY || {};
SKY.wishlist = SKY.wishlist || {};

(function($, SKY) {

    var addToWishlist = function(char) {
		var wl = getWishlist();
        if(wl.indexOf(char) >= 0) return "duplicate";
		wl.push(char);
        sortWishlist(wl);
        saveWishlist(wl);
        return wl;
    };

    var removeFromWishlist = function(char) {
		var wl = getWishlist();
        var i = wl.indexOf(char);
        if(i < -1) return "notFound";
        wl.splice(i, 1);
        saveWishlist(wl);
        return wl;
    };

    var getWishlist = function() {
        var wl = (ATVI.utils.getCookie("skywishlist", true) || "").split(/,/);
        var ret = [];
        for(var i = 0; i < wl.length; i++) {
			//if(SKY.data.versionsMap[wl[i]])
            var entry = wl[i].trim();
            if(entry) ret.push(entry);
        }
        sortWishlist(ret);
        return ret;
    };

    var sortWishlist = function(wl) {
		/*
        var cats = {
            swappable: 1,
            swapforce: 2,
            normal: 3
        };        
        wl.sort(function(a, b) {
            var ca = SKY.data.versionsMap[a];
            var cb = SKY.data.versionsMap[b];
            var cac = cats[ca.category] || 3;
			var cbc = cats[cb.category] || 3; 
            if(cac != cbc) return cac - cbc;
            return ca.displayName < cb.displayName ? -1 : 1;
        });
        */
        wl.sort();
    };

    var saveWishlist = function(wl) {
        var toSave = [];
        for(var i = 0; i < wl.length; i++) {
			var e = (wl[i] || "").trim();
			if(e && e.indexOf(" ") == -1) toSave.push(e);
        }
		ATVI.utils.setCookie("skywishlist", toSave.join(","));
        return toSave;
    };

    SKY.wishlist.add = addToWishlist;
    SKY.wishlist.remove = removeFromWishlist;
    SKY.wishlist.get = getWishlist;


})(jQuery, SKY);

/**
 * jQuery Roundabout - v2.4.2
 * http://fredhq.com/projects/roundabout
 *
 * Moves list-items of enabled ordered and unordered lists long
 * a chosen path. Includes the default "lazySusan" path, that
 * moves items long a spinning turntable.
 *
 * Terms of Use // jQuery Roundabout
 *
 * Open source under the BSD license
 *
 * Copyright (c) 2011-2012, Fred LeBlanc
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *   - Redistributions in binary form must reproduce the above
 *     copyright notice, this list of conditions and the following
 *     disclaimer in the documentation and/or other materials provided
 *     with the distribution.
 *   - Neither the name of the author nor the names of its contributors
 *     may be used to endorse or promote products derived from this
 *     software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
(function(a){"use strict";var b,c,d;a.extend({roundaboutShapes:{def:"lazySusan",lazySusan:function(a,b,c){return{x:Math.sin(a+b),y:Math.sin(a+3*Math.PI/2+b)/8*c,z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}}}});b={bearing:0,tilt:0,minZ:100,maxZ:280,minOpacity:.4,maxOpacity:1,minScale:.4,maxScale:1,duration:600,btnNext:null,btnNextCallback:function(){},btnPrev:null,btnPrevCallback:function(){},btnToggleAutoplay:null,btnStartAutoplay:null,btnStopAutoplay:null,easing:"swing",clickToFocus:true,clickToFocusCallback:function(){},focusBearing:0,shape:"lazySusan",debug:false,childSelector:"li",startingChild:null,reflect:false,floatComparisonThreshold:.001,autoplay:false,autoplayDuration:1e3,autoplayPauseOnHover:false,autoplayCallback:function(){},autoplayInitialDelay:0,enableDrag:false,dropDuration:600,dropEasing:"swing",dropAnimateTo:"nearest",dropCallback:function(){},dragAxis:"x",dragFactor:4,triggerFocusEvents:true,triggerBlurEvents:true,responsive:false};c={autoplayInterval:null,autoplayIsRunning:false,autoplayStartTimeout:null,animating:false,childInFocus:-1,touchMoveStartPosition:null,stopAnimation:false,lastAnimationStep:false};d={init:function(e,f,g){var h,i=(new Date).getTime();e=typeof e==="object"?e:{};f=a.isFunction(f)?f:function(){};f=a.isFunction(e)?e:f;h=a.extend({},b,e,c);return this.each(function(){var b=a(this),c=b.children(h.childSelector).length,e=360/c,i=h.startingChild&&h.startingChild>c-1?c-1:h.startingChild,j=h.startingChild===null?h.bearing:360-i*e,k=b.css("position")!=="static"?b.css("position"):"relative";b.css({padding:0,position:k}).addClass("roundabout-holder").data("roundabout",a.extend({},h,{startingChild:i,bearing:j,oppositeOfFocusBearing:d.normalize.apply(null,[h.focusBearing-180]),dragBearing:j,period:e}));if(g){b.unbind(".roundabout").children(h.childSelector).unbind(".roundabout")}else{if(h.responsive){a(window).bind("resize",function(){d.stopAutoplay.apply(b);d.relayoutChildren.apply(b)})}}if(h.clickToFocus){b.children(h.childSelector).each(function(c){a(this).bind("click.roundabout",function(){var e=d.getPlacement.apply(b,[c]);if(!d.isInFocus.apply(b,[e])){d.stopAnimation.apply(a(this));if(!b.data("roundabout").animating){d.animateBearingToFocus.apply(b,[e,b.data("roundabout").clickToFocusCallback])}return false}})})}if(h.btnNext){a(h.btnNext).bind("click.roundabout",function(){if(!b.data("roundabout").animating){d.animateToNextChild.apply(b,[b.data("roundabout").btnNextCallback])}return false})}if(h.btnPrev){a(h.btnPrev).bind("click.roundabout",function(){d.animateToPreviousChild.apply(b,[b.data("roundabout").btnPrevCallback]);return false})}if(h.btnToggleAutoplay){a(h.btnToggleAutoplay).bind("click.roundabout",function(){d.toggleAutoplay.apply(b);return false})}if(h.btnStartAutoplay){a(h.btnStartAutoplay).bind("click.roundabout",function(){d.startAutoplay.apply(b);return false})}if(h.btnStopAutoplay){a(h.btnStopAutoplay).bind("click.roundabout",function(){d.stopAutoplay.apply(b);return false})}if(h.autoplayPauseOnHover){b.bind("mouseenter.roundabout.autoplay",function(){d.stopAutoplay.apply(b,[true])}).bind("mouseleave.roundabout.autoplay",function(){d.startAutoplay.apply(b)})}if(h.enableDrag){if(!a.isFunction(b.drag)){if(h.debug){alert("You do not have the drag plugin loaded.")}}else if(!a.isFunction(b.drop)){if(h.debug){alert("You do not have the drop plugin loaded.")}}else{b.drag(function(a,c){var e=b.data("roundabout"),f=e.dragAxis.toLowerCase()==="x"?"deltaX":"deltaY";d.stopAnimation.apply(b);d.setBearing.apply(b,[e.dragBearing+c[f]/e.dragFactor])}).drop(function(a){var c=b.data("roundabout"),e=d.getAnimateToMethod(c.dropAnimateTo);d.allowAnimation.apply(b);d[e].apply(b,[c.dropDuration,c.dropEasing,c.dropCallback]);c.dragBearing=c.period*d.getNearestChild.apply(b)})}b.each(function(){var b=a(this).get(0),c=a(this).data("roundabout"),e=c.dragAxis.toLowerCase()==="x"?"pageX":"pageY",f=d.getAnimateToMethod(c.dropAnimateTo);if(b.addEventListener){b.addEventListener("touchstart",function(a){c.touchMoveStartPosition=a.touches[0][e]},false);b.addEventListener("touchmove",function(b){var f=(b.touches[0][e]-c.touchMoveStartPosition)/c.dragFactor;b.preventDefault();d.stopAnimation.apply(a(this));d.setBearing.apply(a(this),[c.dragBearing+f])},false);b.addEventListener("touchend",function(b){b.preventDefault();d.allowAnimation.apply(a(this));f=d.getAnimateToMethod(c.dropAnimateTo);d[f].apply(a(this),[c.dropDuration,c.dropEasing,c.dropCallback]);c.dragBearing=c.period*d.getNearestChild.apply(a(this))},false)}})}d.initChildren.apply(b,[f,g])})},initChildren:function(b,c){var e=a(this),f=e.data("roundabout");b=b||function(){};e.children(f.childSelector).each(function(b){var f,g,h,i=d.getPlacement.apply(e,[b]);if(c&&a(this).data("roundabout")){f=a(this).data("roundabout").startWidth;g=a(this).data("roundabout").startHeight;h=a(this).data("roundabout").startFontSize}a(this).addClass("roundabout-moveable-item").css("position","absolute");a(this).data("roundabout",{startWidth:f||a(this).width(),startHeight:g||a(this).height(),startFontSize:h||parseInt(a(this).css("font-size"),10),degrees:i,backDegrees:d.normalize.apply(null,[i-180]),childNumber:b,currentScale:1,parent:e})});d.updateChildren.apply(e);if(f.autoplay){f.autoplayStartTimeout=setTimeout(function(){d.startAutoplay.apply(e)},f.autoplayInitialDelay)}e.trigger("ready");b.apply(e);return e},updateChildren:function(){return this.each(function(){var b=a(this),c=b.data("roundabout"),e=-1,f={bearing:c.bearing,tilt:c.tilt,stage:{width:Math.floor(a(this).width()*.9),height:Math.floor(a(this).height()*.9)},animating:c.animating,inFocus:c.childInFocus,focusBearingRadian:d.degToRad.apply(null,[c.focusBearing]),shape:a.roundaboutShapes[c.shape]||a.roundaboutShapes[a.roundaboutShapes.def]};f.midStage={width:f.stage.width/2,height:f.stage.height/2};f.nudge={width:f.midStage.width+f.stage.width*.05,height:f.midStage.height+f.stage.height*.05};f.zValues={min:c.minZ,max:c.maxZ,diff:c.maxZ-c.minZ};f.opacity={min:c.minOpacity,max:c.maxOpacity,diff:c.maxOpacity-c.minOpacity};f.scale={min:c.minScale,max:c.maxScale,diff:c.maxScale-c.minScale};b.children(c.childSelector).each(function(g){if(d.updateChild.apply(b,[a(this),f,g,function(){a(this).trigger("ready")}])&&(!f.animating||c.lastAnimationStep)){e=g;a(this).addClass("roundabout-in-focus")}else{a(this).removeClass("roundabout-in-focus")}});if(e!==f.inFocus){if(c.triggerBlurEvents){b.children(c.childSelector).eq(f.inFocus).trigger("blur")}c.childInFocus=e;if(c.triggerFocusEvents&&e!==-1){b.children(c.childSelector).eq(e).trigger("focus")}}b.trigger("childrenUpdated")})},updateChild:function(b,c,e,f){var g,h=this,i=a(b),j=i.data("roundabout"),k=[],l=d.degToRad.apply(null,[360-j.degrees+c.bearing]);f=f||function(){};l=d.normalizeRad.apply(null,[l]);g=c.shape(l,c.focusBearingRadian,c.tilt);g.scale=g.scale>1?1:g.scale;g.adjustedScale=(c.scale.min+c.scale.diff*g.scale).toFixed(4);g.width=(g.adjustedScale*j.startWidth).toFixed(4);g.height=(g.adjustedScale*j.startHeight).toFixed(4);i.css({left:(g.x*c.midStage.width+c.nudge.width-g.width/2).toFixed(0)+"px",top:(g.y*c.midStage.height+c.nudge.height-g.height/2).toFixed(0)+"px",width:g.width+"px",height:g.height+"px",opacity:(c.opacity.min+c.opacity.diff*g.scale).toFixed(2),zIndex:Math.round(c.zValues.min+c.zValues.diff*g.z),fontSize:(g.adjustedScale*j.startFontSize).toFixed(1)+"px"});j.currentScale=g.adjustedScale;if(h.data("roundabout").debug){k.push('<div style="font-weight: normal; font-size: 10px; padding: 2px; width: '+i.css("width")+'; background-color: #ffc;">');k.push('<strong style="font-size: 12px; white-space: nowrap;">Child '+e+"</strong><br />");k.push("<strong>left:</strong> "+i.css("left")+"<br />");k.push("<strong>top:</strong> "+i.css("top")+"<br />");k.push("<strong>width:</strong> "+i.css("width")+"<br />");k.push("<strong>opacity:</strong> "+i.css("opacity")+"<br />");k.push("<strong>height:</strong> "+i.css("height")+"<br />");k.push("<strong>z-index:</strong> "+i.css("z-index")+"<br />");k.push("<strong>font-size:</strong> "+i.css("font-size")+"<br />");k.push("<strong>scale:</strong> "+i.data("roundabout").currentScale);k.push("</div>");i.html(k.join(""))}i.trigger("reposition");f.apply(h);return d.isInFocus.apply(h,[j.degrees])},setBearing:function(b,c){c=c||function(){};b=d.normalize.apply(null,[b]);this.each(function(){var c,e,f,g=a(this),h=g.data("roundabout"),i=h.bearing;h.bearing=b;g.trigger("bearingSet");d.updateChildren.apply(g);c=Math.abs(i-b);if(!h.animating||c>180){return}c=Math.abs(i-b);g.children(h.childSelector).each(function(c){var e;if(d.isChildBackDegreesBetween.apply(a(this),[b,i])){e=i>b?"Clockwise":"Counterclockwise";a(this).trigger("move"+e+"ThroughBack")}})});c.apply(this);return this},adjustBearing:function(b,c){c=c||function(){};if(b===0){return this}this.each(function(){d.setBearing.apply(a(this),[a(this).data("roundabout").bearing+b])});c.apply(this);return this},setTilt:function(b,c){c=c||function(){};this.each(function(){a(this).data("roundabout").tilt=b;d.updateChildren.apply(a(this))});c.apply(this);return this},adjustTilt:function(b,c){c=c||function(){};this.each(function(){d.setTilt.apply(a(this),[a(this).data("roundabout").tilt+b])});c.apply(this);return this},animateToBearing:function(b,c,e,f,g){var h=(new Date).getTime();g=g||function(){};if(a.isFunction(f)){g=f;f=null}else if(a.isFunction(e)){g=e;e=null}else if(a.isFunction(c)){g=c;c=null}this.each(function(){var i,j,k,l=a(this),m=l.data("roundabout"),n=!c?m.duration:c,o=e?e:m.easing||"swing";if(!f){f={timerStart:h,start:m.bearing,totalTime:n}}i=h-f.timerStart;if(m.stopAnimation){d.allowAnimation.apply(l);m.animating=false;return}if(i<n){if(!m.animating){l.trigger("animationStart")}m.animating=true;if(typeof a.easing.def==="string"){j=a.easing[o]||a.easing[a.easing.def];k=j(null,i,f.start,b-f.start,f.totalTime)}else{k=a.easing[o](i/f.totalTime,i,f.start,b-f.start,f.totalTime)}if(d.compareVersions.apply(null,[a().jquery,"1.7.2"])>=0&&!a.easing["easeOutBack"]){k=f.start+(b-f.start)*k}k=d.normalize.apply(null,[k]);m.dragBearing=k;d.setBearing.apply(l,[k,function(){setTimeout(function(){d.animateToBearing.apply(l,[b,n,o,f,g])},0)}])}else{m.lastAnimationStep=true;b=d.normalize.apply(null,[b]);d.setBearing.apply(l,[b,function(){l.trigger("animationEnd")}]);m.animating=false;m.lastAnimationStep=false;m.dragBearing=b;g.apply(l)}});return this},animateToNearbyChild:function(b,c){var e=b[0],f=b[1],g=b[2]||function(){};if(a.isFunction(f)){g=f;f=null}else if(a.isFunction(e)){g=e;e=null}return this.each(function(){var b,h,i=a(this),j=i.data("roundabout"),k=!j.reflect?j.bearing%360:j.bearing,l=i.children(j.childSelector).length;if(!j.animating){if(j.reflect&&c==="previous"||!j.reflect&&c==="next"){k=Math.abs(k)<j.floatComparisonThreshold?360:k;for(b=0;b<l;b+=1){h={lower:j.period*b,upper:j.period*(b+1)};h.upper=b===l-1?360:h.upper;if(k<=Math.ceil(h.upper)&&k>=Math.floor(h.lower)){if(l===2&&k===360){d.animateToDelta.apply(i,[-180,e,f,g])}else{d.animateBearingToFocus.apply(i,[h.lower,e,f,g])}break}}}else{k=Math.abs(k)<j.floatComparisonThreshold||360-Math.abs(k)<j.floatComparisonThreshold?0:k;for(b=l-1;b>=0;b-=1){h={lower:j.period*b,upper:j.period*(b+1)};h.upper=b===l-1?360:h.upper;if(k>=Math.floor(h.lower)&&k<Math.ceil(h.upper)){if(l===2&&k===360){d.animateToDelta.apply(i,[180,e,f,g])}else{d.animateBearingToFocus.apply(i,[h.upper,e,f,g])}break}}}}})},animateToNearestChild:function(b,c,e){e=e||function(){};if(a.isFunction(c)){e=c;c=null}else if(a.isFunction(b)){e=b;b=null}return this.each(function(){var f=d.getNearestChild.apply(a(this));d.animateToChild.apply(a(this),[f,b,c,e])})},animateToChild:function(b,c,e,f){f=f||function(){};if(a.isFunction(e)){f=e;e=null}else if(a.isFunction(c)){f=c;c=null}return this.each(function(){var g,h=a(this),i=h.data("roundabout");if(i.childInFocus!==b&&!i.animating){g=h.children(i.childSelector).eq(b);d.animateBearingToFocus.apply(h,[g.data("roundabout").degrees,c,e,f])}})},animateToNextChild:function(a,b,c){return d.animateToNearbyChild.apply(this,[arguments,"next"])},animateToPreviousChild:function(a,b,c){return d.animateToNearbyChild.apply(this,[arguments,"previous"])},animateToDelta:function(b,c,e,f){f=f||function(){};if(a.isFunction(e)){f=e;e=null}else if(a.isFunction(c)){f=c;c=null}return this.each(function(){var g=a(this).data("roundabout").bearing+b;d.animateToBearing.apply(a(this),[g,c,e,f])})},animateBearingToFocus:function(b,c,e,f){f=f||function(){};if(a.isFunction(e)){f=e;e=null}else if(a.isFunction(c)){f=c;c=null}return this.each(function(){var g=a(this).data("roundabout").bearing-b;g=Math.abs(360-g)<Math.abs(g)?360-g:-g;g=g>180?-(360-g):g;if(g!==0){d.animateToDelta.apply(a(this),[g,c,e,f])}})},stopAnimation:function(){return this.each(function(){a(this).data("roundabout").stopAnimation=true})},allowAnimation:function(){return this.each(function(){a(this).data("roundabout").stopAnimation=false})},startAutoplay:function(b){return this.each(function(){var c=a(this),e=c.data("roundabout");b=b||e.autoplayCallback||function(){};clearInterval(e.autoplayInterval);e.autoplayInterval=setInterval(function(){d.animateToNextChild.apply(c,[b])},e.autoplayDuration);e.autoplayIsRunning=true;c.trigger("autoplayStart")})},stopAutoplay:function(b){return this.each(function(){clearInterval(a(this).data("roundabout").autoplayInterval);a(this).data("roundabout").autoplayInterval=null;a(this).data("roundabout").autoplayIsRunning=false;if(!b){a(this).unbind(".autoplay")}a(this).trigger("autoplayStop")})},toggleAutoplay:function(b){return this.each(function(){var c=a(this),e=c.data("roundabout");b=b||e.autoplayCallback||function(){};if(!d.isAutoplaying.apply(a(this))){d.startAutoplay.apply(a(this),[b])}else{d.stopAutoplay.apply(a(this),[b])}})},isAutoplaying:function(){return this.data("roundabout").autoplayIsRunning},changeAutoplayDuration:function(b){return this.each(function(){var c=a(this),e=c.data("roundabout");e.autoplayDuration=b;if(d.isAutoplaying.apply(c)){d.stopAutoplay.apply(c);setTimeout(function(){d.startAutoplay.apply(c)},10)}})},normalize:function(a){var b=a%360;return b<0?360+b:b},normalizeRad:function(a){while(a<0){a+=Math.PI*2}while(a>Math.PI*2){a-=Math.PI*2}return a},isChildBackDegreesBetween:function(b,c){var d=a(this).data("roundabout").backDegrees;if(b>c){return d>=c&&d<b}else{return d<c&&d>=b}},getAnimateToMethod:function(a){a=a.toLowerCase();if(a==="next"){return"animateToNextChild"}else if(a==="previous"){return"animateToPreviousChild"}return"animateToNearestChild"},relayoutChildren:function(){return this.each(function(){var b=a(this),c=a.extend({},b.data("roundabout"));c.startingChild=b.data("roundabout").childInFocus;d.init.apply(b,[c,null,true])})},getNearestChild:function(){var b=a(this),c=b.data("roundabout"),d=b.children(c.childSelector).length;if(!c.reflect){return(d-Math.round(c.bearing/c.period)%d)%d}else{return Math.round(c.bearing/c.period)%d}},degToRad:function(a){return d.normalize.apply(null,[a])*Math.PI/180},getPlacement:function(a){var b=this.data("roundabout");return!b.reflect?360-b.period*a:b.period*a},isInFocus:function(a){var b,c=this,e=c.data("roundabout"),f=d.normalize.apply(null,[e.bearing]);a=d.normalize.apply(null,[a]);b=Math.abs(f-a);return b<=e.floatComparisonThreshold||b>=360-e.floatComparisonThreshold},getChildInFocus:function(){var b=a(this).data("roundabout");return b.childInFocus>-1?b.childInFocus:false},compareVersions:function(a,b){var c,d=a.split(/\./i),e=b.split(/\./i),f=d.length>e.length?d.length:e.length;for(c=0;c<=f;c++){if(d[c]&&!e[c]&&parseInt(d[c],10)!==0){return 1}else if(e[c]&&!d[c]&&parseInt(e[c],10)!==0){return-1}else if(d[c]===e[c]){continue}if(d[c]&&e[c]){if(parseInt(d[c],10)>parseInt(e[c],10)){return 1}else{return-1}}}return 0}};a.fn.roundabout=function(b){if(d[b]){return d[b].apply(this,Array.prototype.slice.call(arguments,1))}else if(typeof b==="object"||a.isFunction(b)||!b){return d.init.apply(this,arguments)}else{a.error("Method "+b+" does not exist for jQuery.roundabout.")}}})(jQuery)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              /**
 * jQuery Roundabout Shapes v2
 * http://fredhq.com/projects/roundabout-shapes/
 * 
 * Provides additional paths along which items can move for the
 * jQuery Roundabout plugin (v2.0+).
 *
 * Terms of Use // jQuery Roundabout Shapes
 *
 * Open source under the BSD license
 *
 * Copyright (c) 2009-2011, Fred LeBlanc
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 * 
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *   - Redistributions in binary form must reproduce the above 
 *     copyright notice, this list of conditions and the following 
 *     disclaimer in the documentation and/or other materials provided 
 *     with the distribution.
 *   - Neither the name of the author nor the names of its contributors 
 *     may be used to endorse or promote products derived from this 
 *     software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 * POSSIBILITY OF SUCH DAMAGE.
 */
jQuery.extend(jQuery.roundaboutShapes,{theJuggler:function(a,b,c){return{x:Math.sin(a+b),y:Math.tan(Math.exp(Math.log(a))+b)/(c-1),z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},figure8:function(a,b,c){return{x:Math.sin(a*2+b),y:Math.sin(a+Math.PI/2+b)/8*c,z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},waterWheel:function(a,b,c){return{x:Math.sin(a+Math.PI/2+b)/8*c,y:Math.sin(a+b)/(Math.PI/2),z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},square:function(a,b,c){var d,e,f;if(a<=Math.PI/2){d=2/Math.PI*a;e=-(2/Math.PI)*a+1;f=-(1/Math.PI)*a+1}else if(a>Math.PI/2&&a<=Math.PI){d=-(2/Math.PI)*a+2;e=-(2/Math.PI)*a+1;f=-(1/Math.PI)*a+1}else if(a>Math.PI&&a<=3*Math.PI/2){d=-(2/Math.PI)*a+2;e=2/Math.PI*a-3;f=1/Math.PI*a-1}else{d=2/Math.PI*a-4;e=2/Math.PI*a-3;f=1/Math.PI*a-1}return{x:d,y:e*c,z:f,scale:f}},conveyorBeltLeft:function(a,b,c){return{x:-Math.cos(a+b),y:Math.cos(a+3*Math.PI/2+b)/8*c,z:(Math.sin(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},conveyorBeltRight:function(a,b,c){return{x:Math.cos(a+b),y:Math.cos(a+3*Math.PI/2+b)/8*c,z:(Math.sin(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},goodbyeCruelWorld:function(a,b,c){return{x:Math.sin(a+b),y:Math.tan(a+3*Math.PI/2+b)/8*(c+.5),z:(Math.sin(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},diagonalRingLeft:function(a,b,c){return{x:Math.sin(a+b),y:-Math.cos(a+Math.tan(Math.cos(b)))/(c+1.5),z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},diagonalRingRight:function(a,b,c){return{x:Math.sin(a+b),y:Math.cos(a+Math.tan(Math.cos(b)))/(c+1.5),z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},rollerCoaster:function(a,b,c){return{x:Math.sin(a+b),y:Math.sin((2+c)*a),z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},tearDrop:function(a,b,c){return{x:Math.sin(a+b),y:-Math.sin(a/2+c)+.35,z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},tickingClock:function(a,b,c){return{x:Math.cos(a+b-Math.PI/2),y:Math.sin(a+b-Math.PI/2),z:Math.cos(a),scale:Math.cos(a)+.5}},flurry:function(a,b,c){return{x:Math.sin(a*3+b),y:Math.cos(a+Math.PI/2+b)/2*c,z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},nowSlide:function(a,b,c){return{x:Math.tan(a*2+b)*.5,y:Math.cos(a*2+c)/6,z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}},risingEssence:function(a,b,c){return{x:Math.sin(a+b),y:Math.tan((2+c)*a),z:(Math.cos(a+b)+1)/2,scale:Math.sin(a+Math.PI/2+b)/2+.5}}})

/************************************
TRAILERS JS
************************************/

var SKY = SKY || {};

SKY.hometrailers = SKY.hometrailers || {};

(function($, SKY) {

    var init = function($el) {
		resizeCarousel($el);
        initPreorderBtn($el);
        initLightBox($el);
        resize($el);
        $(window).load(function(){
            $(window).trigger("resize"); //just in case if images are taking too long to load ...
        });
    };

    var resizeCarousel = function($el) {
        var $tile = $el.find(".contentTile");
		var tileHeight = $tile.height();
        var logoHeight = $tile.find("#tt-home-logo").height();
        var delta = tileHeight - logoHeight; //90 from the margin-top 
		$el.find(".media-carousel").height(delta);
    };

    var initPreorderBtn = function($el) {
		$preorderBtn = $el.find("#trailer-tile #tt-home-preorder-btn p a");
		var target 
        target = $("#sky-home-container-c4").offset().top - 84;
        $preorderBtn.click(function(e) {
            e.preventDefault();
			SKY.homecore.scrollTo(target);
        });
        $(window).resize(function() {
			target = $("#sky-home-container-c4").offset().top - 84;
            if(window.innerWidth < 768)
				target = $("#sky-home-container-c4").offset().top + 40;
        });
    };

    var initLightBox = function($el) {
        var $link = $el.find(".media-carousel .media-carousel-slide a");
        SKY.homecore.initYoutubeLightBox($link);
    };

    var resize = function($el) {
        $(window).resize(function(){
			resizeCarousel($el);
        });
    };

    SKY.hometrailers.init = init;

})(jQuery, SKY);

/************************************
NEW CHARACTERS JS
************************************/

var SKY = SKY || {};

SKY.homecharacters = SKY.homecharacters || {};

(function($, SKY) {
	var $contentContainer, $skylanderCarousel, $villainCarousel;
	var dialAnimation = false;
	
    var init = function($el) {
		preInit($el);
         $(window).load(function(){
			initRoundAbout();
			initDial();
            initLightBox();
        });        
    };
	
	var preInit = function($el) {
		defineVars($el);
		$skylanderCarousel.parent().addClass("skylanders");
        $villainCarousel.parent().addClass("villains");
		$villainCarousel.parent().addClass("offscreen"); /*onload, villains is offscreen*/
		createElements($el);
		initPageNav($el);
	};
	
	var defineVars = function($el) {
		$contentContainer = $el.find("#new-characters-tile > .contentTile");
		$skylanderCarousel = $el.find("#skylanders-carousel");
		$villainCarousel = $el.find("#villains-carousel");
	};

	var createElements = function($el) {

        //Create nav arrows, name containers, and see me action btn
		var $goodArrowLeft = $("<div class='goodArrowLeft charArrowLeft' />").appendTo($contentContainer);
		var $goodArrowRight = $("<div class='goodArrowRight charArrowRight' />").appendTo($contentContainer);
		var $badArrowLeft = $("<div class='badArrowLeft charArrowLeft' />").appendTo($contentContainer);
		var $badArrowRight = $("<div class='badArrowRight charArrowRight' />").appendTo($contentContainer);
		var $navArrow = $("<div class='nav-game-guide' />").appendTo($contentContainer);
		var $textContainer = $("<div class='character-info' />").appendTo($contentContainer);
		var $badTextContainer = $("<div class='bad-character-info' />").appendTo($contentContainer);
		var $actionBtn = $(".see-me-action-btn");
		
		//Hide elements that will fade in when roundabout is ready
		$textContainer.hide();
		$badTextContainer.hide();
		$actionBtn.hide();
	};

    var initPageNav = function($el) {
		$characterBtn = $el.find(".nav-character-guide p");
		var characterScrollTarget;
        characterScrollTarget = $(window).height() - 55;
        $characterBtn.click(function() {
			SKY.homecore.scrollTo(characterScrollTarget);
        });
		
		$gameBtn = $el.find(".nav-game-guide");
		var gameScrollTarget;
        gameScrollTarget = $("#sky-home-container-c2").offset().top;
		$gameBtn.click(function(){
			SKY.homecore.scrollTo(gameScrollTarget);
		});

        $(window).resize(function() {
			characterScrollTarget = $(window).height() - 55;
            gameScrollTarget = $("#sky-home-container-c2").offset().top;
        });
    };

    var initRoundAbout = function($el) {

		var $skylanderCarouselContainer = $skylanderCarousel.find(".skylanders-carousel-c0");
		var $villainCarouselContainer = $villainCarousel.find(".villains-carousel-c0");

        if($skylanderCarouselContainer.find(".new").length) $skylanderCarouselContainer.find(".new").remove();
		var $carousel1 = $skylanderCarouselContainer.roundabout({
			childSelector:"div",
			autoplay:false,
			btnNext: ".goodArrowRight",
			btnPrev: ".goodArrowLeft",
			maxOpacity: 1,
			minOpacity: 0,
			maxScale: 1,
            minScale: -3,
			enableDrag: true,
			responsive: true,
			shape: "lazySusan",      
			btnNextCallback: function(){
			  characterNameUpdate($skylanderCarouselContainer);
			  updatePagination($skylanderCarouselContainer);
			},
			btnPrevCallback: function(){
			  characterNameUpdate($skylanderCarouselContainer);
			  updatePagination($skylanderCarouselContainer);
			},
			clickToFocusCallback: function(){
			  characterNameUpdate($skylanderCarouselContainer);
			  updatePagination($skylanderCarouselContainer);
			},
			dropCallback: function(){
			  characterNameUpdate($skylanderCarouselContainer);
			  updatePagination($skylanderCarouselContainer);
			}
        },function() {
			characterNameUpdate($skylanderCarouselContainer);
			initPagination($skylanderCarouselContainer);
			updatePagination($skylanderCarouselContainer);
        });

        if($villainCarouselContainer.find(".new").length) $villainCarouselContainer.find(".new").remove();
		var $carousel2 = $villainCarouselContainer.roundabout({
			childSelector:"div",
			autoplay:false,
			btnNext: ".badArrowRight",
			btnPrev: ".badArrowLeft",
			maxOpacity: 1,
			minOpacity: 0,
			maxScale: 1,
            minScale: -3,
			enableDrag: true,
			responsive: true,
			shape: "lazySusan",      
			btnNextCallback: function(){
			  characterNameUpdate($villainCarouselContainer);
			  updatePagination($villainCarouselContainer);
			},
			btnPrevCallback: function(){
			  characterNameUpdate($villainCarouselContainer);
			  updatePagination($villainCarouselContainer);
			},
			clickToFocusCallback: function(){
			  characterNameUpdate($villainCarouselContainer);
			  updatePagination($villainCarouselContainer);
			},
			dropCallback: function(){
			  characterNameUpdate($villainCarouselContainer);
			  updatePagination($villainCarouselContainer);
			}
        },function() {
			characterNameUpdate($villainCarouselContainer);
			initPagination($villainCarouselContainer);
			updatePagination($villainCarouselContainer);
			roundAboutReady(); //When carousels are ready, fade elements into view
        });
    };
	
	var roundAboutReady = function() {
		
		//Once roundabout loads properly, 
		
		//Fade carousels into view
        $skylanderCarousel.hide().css("visibility","visible").fadeIn();
		$villainCarousel.hide().css("visibility","visible").fadeIn();
		
		//Fade name containers into view
        $(".character-info").fadeIn(1000);
		
		//Fade see me in action into view
        $(".see-me-action-btn").fadeIn(1000);
		
		//Fade in/out see me action btn 
		var $arrows = $(".charArrowLeft, .charArrowRight");
		var $bullets = $(".pagination li");
        var $character = $(".roundabout-moveable-item");

		$arrows.add($bullets).add($character).click(function(){
            $(".see-me-action-btn").fadeOut(400);
		});
	};
	
	var initPagination = function($el) {
		
		var $pagination;
		if($el.hasClass("villains-carousel-c0"))
			$pagination = $("<div class='bad-pagination pagination' />").appendTo($contentContainer);
		else
			$pagination = $("<div class='good-pagination pagination' />").appendTo($contentContainer);
			
		var paginationList = "<ul>";
		var num = $el.find(".textimage").length;
		for(var i=0; i < num; i++) {
			paginationList += "<li>" + i + "</li>";
		}
		paginationList += "</ul>";
		$pagination.append(paginationList);
		
		$pagination.find("li").click(function() {
			var idx = $(this).index();
			$el.find(".textimage:eq(" + idx + ")").trigger("click");
		});
	};
	
	var updatePagination = function($el) {
		if($el.hasClass("villains-carousel-c0")) {
			var idx = $el.find(".roundabout-in-focus").index();
			$(".bad-pagination ul li").removeClass("active");
			$(".bad-pagination ul li:eq(" + idx + ")").addClass("active");

            checkActionBtn($villainCarousel);

		} else {
			var idx = $el.find(".roundabout-in-focus").index();
			$(".good-pagination ul li").removeClass("active");
			$(".good-pagination ul li:eq(" + idx + ")").addClass("active");

            checkActionBtn($skylanderCarousel);
		}
	};

    var checkActionBtn = function($el) {
		var curCharacter = $el.find(".roundabout-in-focus");
        if(curCharacter.find("a").length) {
			var link = curCharacter.find("a").attr("href");
            if(link.indexOf("youtube") > 0) {
				$(".see-me-action-btn").fadeIn(700);
            }
        }
    };

    var initDial = function($el) {
		var $dial = $("#new-characters-tile .dial");

        var $villainsBtn = $("#new-characters-tile .character-dial ul li:last-of-type");
        var $skylandersBtn = $("#new-characters-tile .character-dial ul li:first-of-type");

		var $goodArrows = $("#new-characters-tile .goodArrowLeft, #new-characters-tile .goodArrowRight");
		var $badArrows = $("#new-characters-tile .badArrowLeft, #new-characters-tile .badArrowRight");
		
		var $goodName = $("#new-characters-tile .character-info");
		var $badName = $("#new-characters-tile .bad-character-info");
		
		var $goodPagination = $("#new-characters-tile .good-pagination");
		var $badPagination = $("#new-characters-tile .bad-pagination");
		
		var $actionBtn = $("#new-characters-tile .see-me-action-btn");

        var $skyCarousel = $("#new-characters-tile > .contentTile > .skylanders");
        var $vilCarousel = $("#new-characters-tile > .contentTile > .villains");
		
		var section = $("#sky-home-container-c1");
		var villainsBg = $("<div class='villains-bg' />");
		var villainsLineUp = $("<div class='villains-line-up' />");
		section.prepend(villainsLineUp);
		section.prepend(villainsBg);


        $villainsBtn.click(function() {
			if(dialAnimation || $dial.hasClass("villains")) return;
			else dialAnimation = true;
			
            $dial.addClass("villains");
			$vilCarousel.removeClass("offscreen");
            $skyCarousel.addClass("offscreen");
			villainsBg.fadeIn(1000);
			$badArrows.show();
			$goodArrows.hide();
            $goodName.fadeOut(function(){
				$badName.fadeIn();
            });
			$goodPagination.fadeOut(function(){
				$badPagination.fadeIn();
            });
			$actionBtn.fadeOut(function(){
				//$actionBtn.fadeIn();
                checkActionBtn($villainCarousel);
			});
			villainsLineUp.delay(500).animate({top:"45%", opacity:1}, 1000, function(){
				dialAnimation = false;
			});
        });
        $skylandersBtn.click(function() {
			if(dialAnimation || !$dial.hasClass("villains")) return;
			else dialAnimation = true;
			
            $dial.removeClass("villains");
			$vilCarousel.addClass("offscreen");
            $skyCarousel.removeClass("offscreen");
			villainsBg.fadeOut(1000);
			$badArrows.hide();
			$goodArrows.show();
            $badName.fadeOut(function(){
				$goodName.fadeIn();
            });
			$badPagination.fadeOut(function(){
				$goodPagination.fadeIn();
            });
			$actionBtn.fadeOut(function(){
				//$actionBtn.fadeIn();
                checkActionBtn($skylanderCarousel);
			});
			villainsLineUp.animate({top:"0", opacity:0}, 1000, function(){
				dialAnimation = false;
			});
        });

        $dial.click(function(){
            if($(this).hasClass("villains")) $skylandersBtn.trigger("click");
            else $villainsBtn.trigger("click");
        });
    };

	var characterNameUpdate = function($el) {
		var characterText;
		if($el.hasClass("villains-carousel-c0")) {
			characterText = $villainCarousel.find(".roundabout-in-focus .ti-text .text").html();
			$contentContainer.find(".bad-character-info").html(characterText);
		} else {
			characterText = $skylanderCarousel.find(".roundabout-in-focus .ti-text .text").html();
			$contentContainer.find(".character-info").html(characterText);
		}
	};
	
    var initLightBox = function() {
		var $link = $contentContainer.find(".textimage a");
        SKY.homecore.initYoutubeLightBox($link);

        //Click on the action button will synchronously trigger a click on the visible carousel's in focused character
        $("#new-characters-tile .see-me-action-btn").click(function() {
            if(!$contentContainer.find("> .skylanders").hasClass("offscreen")) {
				$contentContainer.find("> .skylanders .textimage.roundabout-in-focus a").trigger("click");
            }
            else {
				$contentContainer.find("> .villains .textimage.roundabout-in-focus a").trigger("click");
            }
        });

    };
	
    SKY.homecharacters.init = init;

})(jQuery, SKY);

/************************************
LATEST AND GREATEST JS
************************************/

var SKY = SKY || {};

SKY.homelatest = SKY.homelatest || {};

(function($, SKY) {

    var animation = false;

    var init = function($el) {
		initScrolling();
		initLightBox($el);
		initTileBg($el);
		initMobileCarousel($el);
    };

    var initScrolling = function() {
        var minijiniObj = {};
        minijiniObj.id = $("#latest-greatest-images-c0 .image:eq(0)");
        minijiniObj.leftMax = -600;
        minijiniObj.leftMin = -32;

        var shroomObj = {};
		shroomObj.id = $("#latest-greatest-images-c0 .image:eq(1)");
		shroomObj.rightMax = 600;
        shroomObj.rightMin = 41;

        var pages = {};
        pages.top = $("#sky-home-container-c1");
        pages.bottom = $("#sky-home-container-c2");

        SKY.homecore.captureScroll(pages, minijiniObj, shroomObj);
		$(window).scroll(function(){
			SKY.homecore.captureScroll(pages, minijiniObj, shroomObj);
		});
	};

	var initLightBox = function($el) {

        var $link = $("#latest-greatest-images-c1 .textimage a");
        SKY.homecore.initYoutubeLightBox($link);


        //Setup gallery lightbox
        var $tilesContainer = $("#latest-greatest-images-c1"); //Tile container
		var $galleryContainer = $("#latest-greatest-gallery"); //Gallery container
        var groupName = "img_gal"; //Group name for fancybox gallery to work
		var $galleryTileLink = $tilesContainer.find(".textimage:eq(1) a"); //Second tile is always gallery box
		var firstSrc = $galleryContainer.find(".image:first-of-type img").attr("src"); //Get first image src in gallery container
		$galleryTileLink.attr("href", firstSrc).attr("rel", groupName); //Assign first image's src to the tile link and give it group rel name
		
		$galleryContainer.find(".image").each(function(index){ //Iterate through all images in gallery container
			if(index != 0) { //Skip the very first image in the gallery container
				var img = $(this).find("img");
				var src = img.attr("src");
				img.wrap("<a href='" + src + "' rel='" + groupName + "'></a>"); //Wrap each image with an a tag and give it the group rel name
			}
		});
		
        $el.find("a[rel=" + groupName + "]").fancybox({ //When any image with group rel name img_gal is clicked on, init lightbox :) 
			'transitionIn'		: 'none',
			'transitionOut'		: 'none',
            'auto'              : true        
        });

    };
	
	var initTileBg = function($el) {
		var $tiles = $el.find("#latest-greatest-images-c1 .textimage");
		$tiles.each(function(){
			var $container = $(this).find(".ti-image-content");
			var src = $(this).find("img").attr("src");
			$container.css("background-image","url(" + src + ")");
			$container.css("background-position","center center");
			$container.css("background-size","cover");
			$container.find("img").css("visibility","hidden");
		});
	};
	
	var initMobileCarousel = function($el) {
		var $carouselContainer = $el.find("#latest-greatest-images-c1");
		$carouselContainer.find(".textimage:first-of-type").addClass("active");
		createNavigation($carouselContainer);
		initMobileCarouselLayout($carouselContainer);
		resize($carouselContainer);
	};
	
	var initMobileCarouselLayout = function($el) {
		var windowWidth = window.innerWidth;
		if(windowWidth < 768) $el.addClass("mobile");	
		else { 
			$el.removeClass("mobile");
			$el.find(".textimage").attr("style","");
		};	
	};
	
	var createNavigation = function($el) {
		//Create pagination
		var numSlides = $el.find(".textimage").length;
		var paginationString = "<div class='pagination'><ul>";
		for(var i=0; i<numSlides; i++) {
			paginationString += "<li>" + i + "</li>";
		}
		paginationString += "</ul></div>";
		$el.append(paginationString);
		
		//Create nav arrows
		var $nextArrow = $("<div class='nav-arrow nav-arrow-next' />").appendTo($el);
		var $prevArrow = $("<div class='nav-arrow nav-arrow-prev' />").appendTo($el);

		//Pagination functionality
		var $paginationBullets = $el.find(".pagination li");
		$paginationBullets.filter(":first-child").addClass("active");
		
		$paginationBullets.click(function() {
			var curIdx = $paginationBullets.filter(".active").index();
			var newIdx = $(this).index();
			var dir;
			if(newIdx > curIdx) dir = "righttoleft";
            else if (newIdx < curIdx) dir = "lefttoright";
			if(newIdx != curIdx) afterNavPagClick(newIdx, dir);
		});
		
		//Navigation functionality
		$nextArrow.click(function() {
			var curIdx = $paginationBullets.filter(".active").index();
			var newIdx = curIdx + 1;
			if(newIdx >= numSlides) newIdx = 0;
			var dir = "righttoleft";
			afterNavPagClick(newIdx, dir);
		});
		
		$prevArrow.click(function() {
			var curIdx = $paginationBullets.filter(".active").index();
			var newIdx = curIdx - 1;
			if(newIdx < 0) newIdx = numSlides - 1;
			var dir = "lefttoright";
			afterNavPagClick(newIdx, dir);
		});
		
		function afterNavPagClick(newIdx, dir) {
			transitionSlide($el, newIdx, dir);
			$paginationBullets.filter(".active").removeClass("active");
			$paginationBullets.filter(":eq(" + newIdx + ")").addClass("active");
		};
	};
	
	var transitionSlide = function($el, newIdx, dir) {

        if(animation) return;
        else animation = true;
        
		var curSlide = $el.find(".textimage.active");
		var newSlide = $el.find(".textimage:eq(" + newIdx + ")");
		
		if(dir == "lefttoright") {
			newSlide.css("left", "-110%").show();
			curSlide.animate({left: "110%"}, 1000);
			newSlide.animate({left: 0}, 1000, function() {
				finishAnimation();
			});
		} else {
			newSlide.css("left", "110%").show();
			curSlide.animate({left: "-110%"}, 1000);
			newSlide.animate({left: 0}, 1000, function() {
				finishAnimation();
			});
		}
		
		function finishAnimation() {
			curSlide.hide().css("left",0);
			curSlide.removeClass("active");
			newSlide.addClass("active");
            animation = false;
		};
	};
	
	var resize = function($el) {
		$(window).resize(function() {
			initMobileCarouselLayout($el);
		});
	};

    SKY.homelatest.init = init;

})(jQuery, SKY);

/************************************
MINI GAMES JS
************************************/

var SKY = SKY || {};

SKY.homeminigames = SKY.homeminigames || {};

(function($, SKY) {

    var init = function($el) {
		initScrolling();
    };

    var initScrolling = function() {
        var wallopObj = {};
        wallopObj.id = $("#minigames-images-c0");
        wallopObj.leftMax = -700;
        wallopObj.leftMin = -285; 

        var chopperObj = {};
        chopperObj.id = $("#minigames-images-c2");
        chopperObj.rightMax = 700;
        chopperObj.rightMin = 295;

        var pages = {};
        pages.top = $("#sky-home-container-c2");
        pages.bottom = $("#sky-home-container-c3");

        SKY.homecore.captureScroll(pages, wallopObj, chopperObj);
		$(window).scroll(function(){
            SKY.homecore.captureScroll(pages, wallopObj, chopperObj);
		});
	};

    SKY.homeminigames.init = init;

})(jQuery, SKY);

/************************************
WHERE TO BUY JS
************************************/

var SKY = SKY || {};

SKY.homewtb = SKY.homewtb || {};

(function($, SKY) {

    var init = function($el) {
		rearrangeDropDowns($el);
        initSelectBoxes($el);
        initTabs($el);
        initLightBox($el);
        initFirstOption($el); //Fix SPYRO-3711
    };

    var rearrangeDropDowns = function($el) {
		var $wtbSections = $el.find(".tt-home-wtb");
        $wtbSections.each(function(){
			var $region = $(this).find(".region");
            var $bundleInfo = $(this).find(".bundle-info-container");
            $bundleInfo.prepend($region);
        });
    };

    var initSelectBoxes = function($el) {
		var $wtbSections = $el.find(".tt-home-wtb");

		$wtbSections.find(".retailer-select").selectbox();
        $wtbSections.find(".region-select").selectbox();
    };

    var initTabs = function($el) {
		var $list = $el.find(".tt-home-wtb-tabs");
        var $standard = $el.find("#tt-home-wtb-standard");
        var $dark = $el.find("#tt-home-wtb-dark");
        var $tablet = $el.find("#tt-home-wtb-tablet");
        var $ds = $el.find("#tt-home-wtb-3ds");
        var $bundles = $el.find(".tt-home-wtb");

        //On load, standard btn is active
        $list.find("li:eq(0)").addClass("active");

        $list.find("li:eq(0)").click(function() {
			//Standard
            switchBundles($standard, $(this));
        });
        $list.find("li:eq(1)").click(function() {
            //Dark
			switchBundles($dark, $(this));
        });
        $list.find("li:eq(2)").click(function() {
            //Tablet
            switchBundles($tablet, $(this));
        });
        $list.find("li:eq(3)").click(function() {
            //3DS
            switchBundles($ds, $(this));
        });

        function switchBundles($activeBundle, $btn) {
            $(".retailer-select").selectbox("detach");
        	$(".retailer-select").selectbox("attach");
			$list.find("li").removeClass("active");
            $btn.addClass("active");
			$bundles.hide();
            $activeBundle.show();
        };
    };

    var initLightBox = function($el) {
		var $compatBtn = $el.find("#tt-home-wtb-tablet .wtb-bundle-description a");
        var $modal = $el.find("#tt-home-wtb-tablet .spacer2 .column-control");
        $("body").append($modal);
        var $newModal = $("body > .column-control");
        $compatBtn.click(function(e) {
            e.preventDefault();
			$newModal.addClass("open");
        });

        var $close = $("<div class='close'/>").prependTo($newModal.find("#tablet-chart-modal"));
        $close.add($newModal).click(function() {
			$newModal.removeClass("open");
        });

        $newModal.find("#tablet-chart-modal").click(function(e){
            e.preventDefault();
			e.stopPropagation();
            e.stopImmediatePropagation();
			var $target = $(e.target);
            console.log("Target: " + $target);
            if($target.is("a")) {
				var link = $target.attr("href");
                window.location = link;
            }
        });

    };

    var initFirstOption = function($el) {
        var $firstOption = $el.find(".tt-home-wtb .region .sbOptions li:first-of-type a");
        $firstOption.trigger("click");
    };

    SKY.homewtb.init = init;

})(jQuery, SKY);

(function($) {
	//Init custom select boxes
    ATVI.components.preorder = ATVI.components.preorder || {};
    ATVI.components.preorder.options = ATVI.components.preorder.options || {};
    ATVI.components.preorder.options.onRetailerSelectUpdate = function() {
        $(".retailer-select").selectbox("detach");
        $(".retailer-select").selectbox("attach");   
    }; 

})(jQuery);


var SKY = SKY || {};

SKY.homecore = SKY.homecore || {};

(function($, SKY) {


    var init = function() {
        //initWindows(); 
        initPages();
        initScroll();
    };

    var initPages = function() {
        SKY.header.init();
        SKY.hometrailers.init($("#sky-home-container-c0"));
		SKY.homecharacters.init($("#sky-home-container-c1"));
        SKY.homelatest.init($("#sky-home-container-c2"));
        SKY.homeminigames.init($("#sky-home-container-c3"));
        SKY.homewtb.init($("#sky-home-container-c4"));
    };

    var initWindows = function() {
        if(ATVI.pageMode != "edit") {
            $("#sky-home-container .sky-home-container-child").windows({
                snapping: true,
                snapSpeed: 500,
                snapInterval: 1100,
                onScroll: function(scrollPos){
                    // scrollPos:Number
                },
                onSnapComplete: function($el){
                    // after window ($el) snaps into place
                    var id = $el.context.id;

                    /*switch(id) {

                        case "page-content-c1":
                            TT.ways.init($el);
                        break;

                    }*/

                },
                onWindowEnter: function($el){
                    // when new window ($el) enters viewport
                }
            })
        }
    };

    var captureScroll = function(pages, char1Obj, char2Obj) {
		var page1Top = pages.top.offset().top;
		var page2Top = pages.bottom.offset().top;
		var documentTop = $(document).scrollTop();
		var pageDelta = page2Top - page1Top;
		var maxTarget = page1Top + (pageDelta * .75);
		var maxDelta = maxTarget - page1Top;
		if(documentTop > page1Top) {
            var scrollPer = (documentTop-page1Top)/maxDelta;
            var char1LeftDelta = Math.abs(scrollPer * (char1Obj.leftMax - char1Obj.leftMin));
            var char2RightDelta = Math.abs(scrollPer * (char2Obj.rightMax - char2Obj.rightMin));
            var newChar1Left =  char1Obj.leftMax + char1LeftDelta;
            var newChar2Right = char2Obj.rightMax - char2RightDelta;
            if(documentTop <= maxTarget) {
                char1Obj.id.css({
                    transform: "translate(" + newChar1Left + "px,0)",
                    opacity: scrollPer
                });
                char2Obj.id.css({
                    transform: "translate(" + newChar2Right + "px,0)",
                    opacity: scrollPer
                });
            } else {
                char1Obj.id.css({
                    transform: "translate(" + char1Obj.leftMin + "px,0)",
                    opacity: 1
                });
                char2Obj.id.css({
                    transform: "translate(" + char2Obj.rightMin + "px,0)",
                    opacity: 1
                });
                
            }
		}
	};

    var scrollTo = function(target) {
		$('html, body').stop().animate({
			scrollTop: target
		}, 1000);
	};

    var initYoutubeLightBox = function($link) {
		$link.each(function(){
            var thisHref = $(this).attr("href");
			if(thisHref.indexOf("youtube") > 0) {
                var newLink = thisHref.replace(new RegExp("watch\\?v=", "i"), 'embed/') + "?autoplay=1";
            	$(this).attr("href", newLink);
			}
        });

        $link.click(function() {
			var that = $(this);
			var thisHref = that.attr("href");
            if(thisHref.indexOf("youtube") > 0) {
               if(that.closest(".roundabout-moveable-item").length && !that.closest(".roundabout-moveable-item").hasClass("roundabout-in-focus")) return; //prevent lightbox on non-focus characters
				$.fancybox({
					'padding'		: 0,
					'autoScale'		: false,
					'transitionIn'	: 'none',
					'transitionOut'	: 'none',
					'width'			: 1000,
					'height'		: 563,
                    'href'          : thisHref,
					'type'			: 'iframe'
				}); 
				
				return false; 
			}
        });
    };

    /**
    	ANALYTICS SETUP FOR SCROLL EVENT
    */
    var $document = null;
    var dHeight = 0;
    var c4 = null;
    var c4PosY = 0;
    var scrollToC4 = false;
    var epsilon = window.innerHeight;

    //since contents may have shifted while moving...
    $(window).on('resize',function(){
		dHeight = $document.height();
        c4PosY = c4.position().top;
    });

    //scroll event for analytics
    $(window).on('scroll',function(){
        if(Math.abs(window.scrollY - c4PosY) < epsilon && !scrollToC4){
            ATVI.analytics.sendEvent('page-scroll','homepage-scroll',null);
            scrollToC4 = true;
        }
    });

    //initialize DOM retrieval for scroll event access
    var initScroll = function(){
        $document = $(document);
        c4 = $('#sky-home-container-c4');
        $(window).trigger('resize');
    }

    SKY.homecore.captureScroll = captureScroll;
    SKY.homecore.scrollTo = scrollTo;
    SKY.homecore.initYoutubeLightBox = initYoutubeLightBox;

    $(init);

})(jQuery, SKY);




}

/*
     FILE ARCHIVED ON 08:54:55 Oct 01, 2014 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 10:52:56 Sep 05, 2026.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 0.662
  exclusion.robots: 0.079
  exclusion.robots.policy: 0.063
  esindex: 0.011
  cdx.remote: 5.273
  LoadShardBlock: 363.736 (3)
  PetaboxLoader3.datanode: 364.303 (4)
  load_resource: 72.798
  PetaboxLoader3.resolve: 59.743
*/