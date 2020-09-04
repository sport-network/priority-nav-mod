/*
 * priority-nav - v1.0.12 | (c) 2016 @gijsroge | MIT license
 * Repository: https://github.com/gijsroge/priority-navigation.git
 * Description: Priority+ pattern navigation that hides menu items if they don't fit on screen.
 * Demo: http://gijsroge.github.io/priority-nav.js/
 */

Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
};

/*global HTMLCollection */
NodeList.prototype.remove = HTMLCollection.prototype.remove = function () {
    for (var i = 0, len = this.length; i < len; i++) {
        if (this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
};

export default class {
    constructor(opts) {
        this.breaks = [];
        this.supports = null;
        this.settings = {};
        this.instance = 0;
        this.count = 0;
        this.mainNavWrapper = null;
        this.totalWidth = null;
        this.restWidth = null;
        this.mainNav = null;
        this.navDropdown = null;
        this.navDropdownToggle = null;
        this.dropDownWidth = null;
        this.toggleWrapper = null;
        this.viewportWidth = 0;
        this.resizeFunction = null;
        this.defaults = {
            initClass: "js-priorityNav", // Class that will be printed on html element to allow conditional css styling.
            mainNavWrapper: "nav", // mainnav wrapper selector (must be direct parent from mainNav)
            mainNav: "ul", // mainnav selector. (must be inline-block)
            navDropdownClassName: "nav__dropdown", // class used for the dropdown.
            navDropdownToggleClassName: "nav__dropdown-toggle", // class used for the dropdown toggle.
            navDropdownLabel: "more", // Text that is used for the dropdown toggle.
            navDropdownBreakpointLabel: "menu", //button label for navDropdownToggle when the breakPoint is reached.
            breakPoint: 500, //amount of pixels when all menu items should be moved to dropdown to simulate a mobile menu
            throttleDelay: 50, // this will throttle the calculating logic on resize because i'm a responsible dev.
            offsetPixels: 0, // increase to decrease the time it takes to move an item.
            count: true, // prints the amount of items are moved to the attribute data-count to style with css counter.

            //Callbacks
            moved: function () {
            },
            movedBack: function () {
            }
        };
        this.forEach = this.forEach.bind(this);
        this.getClosest = this.getClosest.bind(this);
        this.extend = this.extend.bind(this);
        this.debounce = this.debounce.bind(this);
        this.toggleClass = this.toggleClass.bind(this);
        this.prepareHtml = this.prepareHtml.bind(this);
        this.getElementContentWidth = this.getElementContentWidth.bind(this);
        this.viewportSize = this.viewportSize.bind(this);
        this.calculateWidths = this.calculateWidths.bind(this);
        this.doesItFit = this.doesItFit.bind(this);
        this.showToggle = this.showToggle.bind(this);
        this.updateCount = this.updateCount.bind(this);
        this.updateLabel = this.updateLabel.bind(this);
        this.toDropdown = this.toDropdown.bind(this);
        this.toMenu = this.toMenu.bind(this);
        this.getChildrenWidth = this.getChildrenWidth.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.listeners = this.listeners.bind(this);
        this.destroy = this.destroy.bind(this);
        this.init = this.init.bind(this);
    }

    forEach(collection, callback, scope) {
        if (Object.prototype.toString.call(collection) === "[object Object]") {
            for (var prop in collection) {
                if (Object.prototype.hasOwnProperty.call(collection, prop)) {
                    callback.call(scope, collection[prop], prop, collection);
                }
            }
        } else {
            for (var i = 0, len = collection.length; i < len; i++) {
                callback.call(scope, collection[i], i, collection);
            }
        }
    };

    getClosest(elem, selector) {
        var firstChar = selector.charAt(0);
        for (; elem && elem !== document; elem = elem.parentNode) {
            if (firstChar === ".") {
                if (elem.classList.contains(selector.substr(1))) {
                    return elem;
                }
            } else if (firstChar === "#") {
                if (elem.id === selector.substr(1)) {
                    return elem;
                }
            } else if (firstChar === "[") {
                if (elem.hasAttribute(selector.substr(1, selector.length - 2))) {
                    return elem;
                }
            }
        }
        return false;
    };

    extend(defaults, options) {
        var extended = {};
        this.forEach(defaults, function (value, prop) {
            extended[prop] = defaults[prop];
        });
        this.forEach(options, function (value, prop) {
            extended[prop] = options[prop];
        });
        return extended;
    };

    debounce(func, wait, immediate) {
        var timeout;
        var self = this;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (self.settings) {
                    if (!immediate) func.apply(context, args);
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    toggleClass(el, className) {
        if (el.classList) {
            el.classList.toggle(className);
        } else {
            var classes = el.className.split(" ");
            var existingIndex = classes.indexOf(className);

            if (existingIndex >= 0)
                classes.splice(existingIndex, 1); else
                classes.push(className);

            el.className = classes.join(" ");
        }
    };


    prepareHtml(_this, settings) {
        const self = this;
        /**
         * Create dropdow menu
         * @type {HTMLElement}
         */
        self.toggleWrapper = document.createElement("span");
        self.navDropdown = document.createElement("ul");
        self.navDropdownToggle = document.createElement("button");

        /**
         * Set label for dropdown toggle
         * @type {string}
         */
        self.navDropdownToggle.innerHTML = self.settings.navDropdownLabel;

        /**
         * Set aria attributes for accessibility
         */
        self.navDropdownToggle.setAttribute("aria-controls", "menu");
        self.navDropdownToggle.setAttribute("type", "button");
        self.navDropdown.setAttribute("aria-hidden", "true");


        /**
         * Move elements to the right spot
         */
        if (_this.querySelector(self.mainNav).parentNode !== _this) {
            console.warn("mainNav is not a direct child of mainNavWrapper, double check please");
            return;
        }

        _this.insertAfter(self.toggleWrapper, _this.querySelector(self.mainNav));

        self.toggleWrapper.appendChild(self.navDropdownToggle);
        self.toggleWrapper.appendChild(self.navDropdown);

        /**
         * Add classes so we can target elements
         */
        self.navDropdown.classList.add(self.settings.navDropdownClassName);
        self.navDropdown.classList.add("priority-nav__dropdown");

        self.navDropdownToggle.classList.add(self.settings.navDropdownToggleClassName);
        self.navDropdownToggle.classList.add("priority-nav__dropdown-toggle");

        self.toggleWrapper.classList.add(self.settings.navDropdownClassName + "-wrapper");
        self.toggleWrapper.classList.add("priority-nav__wrapper");

        _this.classList.add("priority-nav");
    };


    getElementContentWidth(element) {
        var styles = window.getComputedStyle(element);
        var padding = parseFloat(styles.paddingLeft) +
            parseFloat(styles.paddingRight);

        return element.clientWidth - padding;
    };


    viewportSize() {
        var doc = document, w = window;
        var docEl = (doc.compatMode && doc.compatMode === "CSS1Compat") ?
            doc.documentElement : doc.body;

        var width = docEl.clientWidth;
        var height = docEl.clientHeight;

        // mobile zoomed in?
        if (w.innerWidth && width > w.innerWidth) {
            width = w.innerWidth;
            height = w.innerHeight;
        }

        return { width: width, height: height };
    };


    calculateWidths(_this) {
        const self = this;
        self.totalWidth = this.getElementContentWidth(_this);
        //Check if parent is the navwrapper before calculating its width
        if (self.navDropdown && _this.querySelector(self.navDropdown)) {
            if (_this.querySelector(self.navDropdown).parentNode === _this) {
                self.dropDownWidth = _this.querySelector(self.navDropdown).offsetWidth;
            } else {
                self.dropDownWidth = 0;
            }
            self.restWidth = self.getChildrenWidth(_this) + self.settings.offsetPixels;
            self.viewportWidth = this.viewportSize().width;
        }
    };

    doesItFit(_this) {
        const self = this;
        /**
         * Check if it is the first run
         */
        var delay = _this.getAttribute("instance") === 0 ? delay : self.settings.throttleDelay;

        /**
         * Increase instance
         */
        self.instance++;

        /**
         * Debounced execution of the main logic
         */
        (self.debounce(function () {

            /**
             * Get the current element"s instance
             * @type {string}
             */
            var identifier = _this.getAttribute("instance");

            /**
             * Update width
             */
            self.calculateWidths(_this);

            /**
             * Keep executing until all menu items that are overflowing are moved
             */
            while (self.totalWidth <= self.restWidth && _this.querySelector(self.mainNav).children.length > 0 || self.viewportWidth < self.settings.breakPoint && _this.querySelector(self.mainNav).children.length > 0) {
                //move item to dropdown
                self.toDropdown(_this, identifier);
                //recalculate widths
                self.calculateWidths(_this, identifier);
                //update dropdownToggle label
                if (self.viewportWidth < self.settings.breakPoint) self.updateLabel(_this, identifier, self.settings.navDropdownBreakpointLabel);
            }

            /**
             * Keep executing until all menu items that are able to move back are moved
             */
            while (self.totalWidth > self.breaks[identifier][self.breaks[identifier].length - 1] && self.viewportWidth > self.settings.breakPoint) {
                //move item to menu
                self.toMenu(_this, identifier);
                //update dropdownToggle label
                if (self.viewportWidth > self.settings.breakPoint) self.updateLabel(_this, identifier, self.settings.navDropdownLabel);
            }

            /**
             * If there are no items in dropdown hide dropdown
             */
            if (self.breaks[identifier].length < 1) {
                _this.querySelector(self.navDropdown).classList.remove("show");
                //show navDropdownLabel
                self.updateLabel(_this, identifier, self.settings.navDropdownLabel);
            }

            /**
             * If there are no items in menu
             */
            if (_this.querySelector(self.mainNav).children.length < 1) {
                //show navDropdownBreakpointLabel
                _this.classList.add("is-empty");
                self.updateLabel(_this, identifier, self.settings.navDropdownBreakpointLabel);
            } else {
                _this.classList.remove("is-empty");
            }

            /**
             * Check if we need to show toggle menu button
             */
            self.showToggle(_this, identifier);

        }, delay))();
    };


    showToggle(_this, identifier) {
        const self = this;
        if (self.breaks[identifier].length < 1) {
            _this.querySelector(self.navDropdownToggle).classList.add("priority-nav-is-hidden");
            _this.querySelector(self.navDropdownToggle).classList.remove("priority-nav-is-visible");
            _this.classList.remove("priority-nav-has-dropdown");

            /**
             * Set aria attributes for accessibility
             */
            _this.querySelector(".priority-nav__wrapper").setAttribute("aria-haspopup", "false");

        } else {
            _this.querySelector(self.navDropdownToggle).classList.add("priority-nav-is-visible");
            _this.querySelector(self.navDropdownToggle).classList.remove("priority-nav-is-hidden");
            _this.classList.add("priority-nav-has-dropdown");

            /**
             * Set aria attributes for accessibility
             */
            _this.querySelector(".priority-nav__wrapper").setAttribute("aria-haspopup", "true");
        }
    };

    updateCount(_this, identifier) {
        const self = this;
        _this.querySelector(self.navDropdownToggle).setAttribute("priorityNav-count", self.breaks[identifier].length);
    };

    updateLabel(_this, identifier, label) {
        const self = this;
        _this.querySelector(self.navDropdownToggle).innerHTML = label;
    };


    toDropdown(_this, identifier) {
        const self = this;

        /**
         * move last child of navigation menu to dropdown
         */
        if (_this.querySelector(self.navDropdown).firstChild && _this.querySelector(self.mainNav).children.length > 0) {
            _this.querySelector(self.navDropdown).insertBefore(_this.querySelector(self.mainNav).lastElementChild, _this.querySelector(self.navDropdown).firstChild);
        } else if (_this.querySelector(self.mainNav).children.length > 0) {
            _this.querySelector(self.navDropdown).appendChild(_this.querySelector(self.mainNav).lastElementChild);
        }

        /**
         * store breakpoints
         */
        self.breaks[identifier].push(self.restWidth);

        /**
         * check if we need to show toggle menu button
         */
        self.showToggle(_this, identifier);

        /**
         * update count on dropdown toggle button
         */
        if (_this.querySelector(self.mainNav).children.length > 0 && self.settings.count) {
            self.updateCount(_this, identifier);
        }

        /**
         * If item has been moved to dropdown trigger the callback
         */
        self.settings.moved();
    };


    toMenu(_this, identifier) {
        const self = this;
        /**
         * move last child of navigation menu to dropdown
         */
        if (_this.querySelector(self.navDropdown).children.length > 0) _this.querySelector(self.mainNav).appendChild(_this.querySelector(self.navDropdown).firstElementChild);

        /**
         * remove last breakpoint
         */
        self.breaks[identifier].pop();

        /**
         * Check if we need to show toggle menu button
         */
        self.showToggle(_this, identifier);

        /**
         * update count on dropdown toggle button
         */
        if (_this.querySelector(self.mainNav).children.length > 0 && self.settings.count) {
            self.updateCount(_this, identifier);
        }

        /**
         * If item has been moved back to the main menu trigger the callback
         */
        self.settings.movedBack();
    };


    getChildrenWidth(e) {
        var children = e.childNodes;
        var sum = 0;
        for (var i = 0; i < children.length; i++) {
            if (children[i].nodeType !== 3) {
                if (!isNaN(children[i].offsetWidth)) {
                    sum += children[i].offsetWidth;
                }

            }
        }
        return sum;
    };

    handleResize(_this, e) {
        const self = this;
        if (self.doesItFit) self.doesItFit(_this);
    }

    listeners(_this, settings) {

        const self = this;

        self.resizeFunction = self.handleResize.bind(self, _this);
        // Check if an item needs to move
        if (window.attachEvent) {
            window.attachEvent("onresize", self.resizeFunction);
        }
        else if (window.addEventListener) {
            window.addEventListener("resize", self.resizeFunction, true);
        }

        // Toggle dropdown
        _this.querySelector(self.navDropdownToggle).addEventListener("click", function () {
            self.toggleClass(_this.querySelector(self.navDropdown), "show");
            self.toggleClass(this, "is-open");
            self.toggleClass(_this, "is-open");

            /**
             * Toggle aria hidden for accessibility
             */
            if (-1 !== _this.className.indexOf("is-open")) {
                _this.querySelector(self.navDropdown).setAttribute("aria-hidden", "false");
            } else {
                _this.querySelector(self.navDropdown).setAttribute("aria-hidden", "true");
                _this.querySelector(self.navDropdown).blur();
            }
        });

        /*
         * Remove when clicked outside dropdown
         */
        document.addEventListener("click", function (event) {
            if (self.settings) {
                if (!self.getClosest(event.target, "." + self.settings.navDropdownClassName) && event.target !== _this.querySelector(self.navDropdownToggle)) {
                    _this.querySelector(self.navDropdown).classList.remove("show");
                    _this.querySelector(self.navDropdownToggle).classList.remove("is-open");
                    _this.classList.remove("is-open");
                }
            }
        });

        /**
         * Remove when escape key is pressed
         */
        document.onkeydown = function (evt) {
            evt = evt || window.event;
            if (evt.keyCode === 27) {
                document.querySelector(self.navDropdown).classList.remove("show");
                document.querySelector(navDropdownToggle).classList.remove("is-open");
                self.mainNavWrapper.classList.remove("is-open");
            }
        };
    };


    destroy(mainNavWrapper) {
        const self = this;
        const _this = document.querySelectorAll(this.settings.mainNavWrapper)[0];
        // If plugin isn"t already initialized, stop
        if (!this.settings) return;

        let dropdownChildren = _this.querySelector(self.navDropdown).childNodes;
        while (dropdownChildren.length > 0) {
            _this.querySelector(self.mainNav).appendChild(_this.querySelector(self.navDropdown).firstElementChild);
            dropdownChildren = _this.querySelector(self.navDropdown).childNodes;
        }
        // Remove feedback class
        document.documentElement.classList.remove(this.settings.initClass);
        // Remove toggle
        this.toggleWrapper.remove();
        // Remove settings
        this.settings = null;
        this.init = null;
        delete this.init;
        this.doesItFit = null;
        delete this.doesItFit;
        if (window.detachEvent) {
            window.detachEvent("onresize", self.resizeFunction);
            self.resizeFunction = null;
        }
        else if (window.removeEventListener) {
            window.removeEventListener("resize", self.resizeFunction, true);
            self.resizeFunction = null;
        }
    };

    checkForSymbols(string) {
        var firstChar = string.charAt(0);
        if (firstChar === "." || firstChar === "#") {
            return false;
        } else {
            return true;
        }
    };


    init(options) {
        const self = this;
        /**
         * Merge user options with defaults
         * @type {Object}
         */
        this.settings = this.extend(this.defaults, options || {});


        Node.prototype.insertAfter = function (n, r) { this.insertBefore(n, r.nextSibling); };

        // Feature test.
        if (!this.supports && typeof Node === "undefined") {
            console.warn("This browser doesn't support priorityNav");
            return;
        }

        // Options check
        if (!this.checkForSymbols(this.settings.navDropdownClassName) || !this.checkForSymbols(this.settings.navDropdownToggleClassName)) {
            console.warn("No symbols allowed in navDropdownClassName & navDropdownToggleClassName. These are not selectors.");
            return;
        }

        /**
         * Store nodes
         * @type {NodeList}
         */
        var _this = document.querySelectorAll(this.settings.mainNavWrapper)[0];

        /**
         * Create breaks array
         * @type {number}
         */
        self.breaks[self.count] = [];

        /**
         * Set the instance number as data attribute
         */
        _this.setAttribute("instance", self.count++);

        /**
         * Store the wrapper element
         */
        self.mainNavWrapper = _this;
        if (!self.mainNavWrapper) {
            console.warn("couldn't find the specified mainNavWrapper element");
            return;
        }

        /**
         * Store the menu elementStore the menu element
         */
        self.mainNav = self.settings.mainNav;
        if (!_this.querySelector(self.mainNav)) {
            console.warn("couldn't find the specified mainNav element");
            return;
        }

        /**
         * Check if we need to create the dropdown elements
         */
        self.prepareHtml(_this, self.settings);

        /**
         * Store the dropdown element
         */
        self.navDropdown = "." + self.settings.navDropdownClassName;
        if (!_this.querySelector(self.navDropdown)) {
            console.warn("couldn't find the specified navDropdown element");
            return;
        }

        /**
         * Store the dropdown toggle element
         */
        self.navDropdownToggle = "." + self.settings.navDropdownToggleClassName;
        if (!_this.querySelector(self.navDropdownToggle)) {
            console.warn("couldn't find the specified navDropdownToggle element");
            return;
        }

        /**
         * Event listeners
         */
        self.listeners(_this, self.settings);

        /**
         * Start first check
         */
        self.doesItFit(_this);

        /**
         * Add class to HTML element to activate conditional CSS
         */
        document.documentElement.classList.add(self.settings.initClass);
    };
};
