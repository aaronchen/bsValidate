/**
 * jQuery Plugin - Bootstrap Validate (bsValidate)
 *
 * Requirements:
 *   - Bootstrap 4
 *   - Need to add `novalidate` attribute to form element in order to work with Bootstrap validation
 *   - Add `bs-validate` class to input element to automatically enable bsValidate
 *
 * === bsValidate ====
 *
 * $(".bs-validate").bsValidate(options);
 *
 * === bsValidate Options ===
 * @param {Object} options - bsValidate options
 * @param {boolean} options.alphanumericHelper - Enable alphanumeric helper  [<input> only] (default: false)
 * @param {boolean} options.autoTrim - Auto-trim input value. (default: true)
 * @param {boolean} options.emailDomainHelper - Enable Email Domain helper [<input type="email"> only] (default: false)
 * @param {string} options.helperClass - Bootstrap class for displaying Helpers (default: "text-info")
 * @param {string} options.hint - Hint
 * @param {string} options.hintClass - Bootstrap class for displaying Hint (default: "text-muted")
 * @param {boolean} options.hintOnFocus - Only show Hint on `focus` (default: false)
 * @param {boolean} options.maxLengthHelper - Enable maxLength helper  [<input> only] (default: false)
 * @param {function(BootstrapValidate): void} options.onBlur - On `blur` callback
 * @param {function(BootstrapValidate): void} options.onFocus - On `focus` callback
 * @param {function(BootstrapValidate): void} options.onInput - On `input` callback
 * @param {function(BootstrapValidate): void} options.onReset - On `reset` callback
 * @param {function(BootstrapValidate): void} options.onSubmit - On `submit` callback
 * @param {function(BootstrapValidate): void} options.onValid - On valid `input` callback
 * @param {number} options.onValidDebounce - Debounce for valid `input` callback (default: 700)
 * @param {string} options.patternMismatchErrorMessage - Custom invalid message for pattern mismatch
 * @param {string} options.spinnerClass - Bootstrap class for displaying Spinner (default: "text-primary")
 *
 * === bsValidate Options As data-* Attributes ===
 * data-alphanumeric-helper (boolean)
 * data-auto-trim (boolean)
 * data-email-domain-helper (boolean)
 * data-helper-class (string)
 * data-hint (string)
 * data-hint-class (string)
 * data-hint-on-focus (boolean)
 * data-max-length-helper (boolean)
 * data-on-blur (string)
 * data-on-focus (string)
 * data-on-input (string)
 * data-on-reset (string)
 * data-on-submit (string)
 * data-on-valid (string)
 * data-on-valid-debounce (number)
 * data-pattern-mismatch-error-message (string)
 * data-spinner-class (string)
 */

(function ($) {
  class BootstrapValidate {
    constructor(element, options) {
      this.element = element;
      this.options = options;
      this.$element = $(element);

      this.customValidityEvents = [];
      this.errors = [];

      this.onBlur = this._toFunction(options.onBlur);
      this.onFocus = this._toFunction(options.onFocus);
      this.onInput = this._toFunction(options.onInput);
      this.onReset = this._toFunction(options.onReset);
      this.onSubmit = this._toFunction(options.onSubmit);
      this.onValid = null;

      this.isInputGroup = false;
      this.isFormCheck = false;
      this.$after = null;
      this.$label = null;
      this.$spinner = null;

      this._observer = null;
      this._timeoutId = null;

      this._addListeners();
      this._checkFlags();
      this._setAfter();
      this._setLabel();
      this._addHint();
      this._wrapOnValid();
      this._addHelpers();
      this._startObserver();

      this.toggleLabelRequired();
    }

    _addListeners() {
      const self = this;

      self.$element.on({
        input: function () {
          self.removeSpinner();
          self.onInput instanceof Function && self.onInput(self);
          self._timeoutId && clearTimeout(self._timeoutId);

          self.reportValidity() &&
            self.onValid instanceof Function &&
            self.onValid(self);
        },
        blur: function () {
          self.hideHint();
          self.removeInvalidFeedback();

          if (self.options.autoTrim) {
            self.trim();
          }

          self.onBlur instanceof Function && self.onBlur(self);
        },
        focus: function () {
          self.showHint();

          if (self.hasErrors()) {
            self.addInvalidFeedback();
          }

          self.onFocus instanceof Function && self.onFocus(self);
        },
        report: function (event) {
          event.stopImmediatePropagation();
          self.reportValidity();
        },
        reset: function (event) {
          event.stopImmediatePropagation();
          self.clear();
          self.resetErrors();
          self.hideHint();
          self.removeSpinner();
          self.removeInvalidFeedback();
          self.onReset instanceof Function && self.onReset(self);
        },
        submit: function (event) {
          event.stopImmediatePropagation();

          if (self.options.autoTrim) {
            self.trim(false);
          }

          self.reportValidity();
          self.onSubmit instanceof Function && self.onSubmit(self);
        },
      });

      if (self.element.type === "radio") {
        self.$element.on("input", function () {
          $(`[name="${self.element.name}"]`)
            .not(self.$element)
            .each(function () {
              $(this).trigger("report");
            });
        });
      }
    }

    _checkFlags() {
      this.isInputGroup = this.$element.parent(".input-group").length > 0;
      this.isFormCheck = ["checkbox", "radio"].includes(this.element.type);
    }

    _setAfter() {
      this.$after = this.isInputGroup ? this.$element.parent() : this.$element;
    }

    _setLabel() {
      let $label = this.$element.prev("label, legend");

      if (!$label.length) {
        $label = this.$element
          .parents(".form-group, .form-row, .row")
          .first()
          .find("label, legend")
          .first();
      }

      if (!$label.length && this.element.id && !this.isFormCheck) {
        $label = $(`label[for="${this.element.id}"]`);
      }

      this.$label = $label;
    }

    _addHint() {
      if (!this.options.hint) {
        return;
      }

      const hintVisibility = this.options.hintOnFocus ? "d-none" : "";

      this.$after.after(`
        <div class="form-text ${this.options.hintClass} small ${hintVisibility} mb-0 bs-validate-hint">
          ${this.options.hint}
        </div>
      `);
    }

    _wrapOnValid() {
      const self = this;
      const onValid = self._toFunction(self.options.onValid);

      if (onValid instanceof Function === false) {
        return;
      }

      self.onValid = function (self) {
        clearTimeout(self._timeoutId);
        self._timeoutId = setTimeout(
          onValid,
          self.options.onValidDebounce,
          self
        );
      };
    }

    _addHelpers() {
      Object.keys(BootstrapValidate.Helpers).forEach(function (helper) {
        this.options[helper] && BootstrapValidate.Helpers[helper](this);
      }, this);

      this.options.autoTrim && BootstrapValidate.Helpers.minLengthHelper(this);
    }

    _startObserver() {
      this._observer = new MutationObserver(this._houseKeeping.bind(this));
      this._observer.observe(this.element, { attributeFilter: ["required"] });
    }

    _houseKeeping(mutations) {
      mutations.forEach(function (mutation) {
        switch (mutation.type) {
          case "attributes":
            switch (mutation.attributeName) {
              case "required":
                this.toggleLabelRequired();
                break;
            }
            break;
        }
      }, this);
    }

    _toFunction(func) {
      if (func instanceof Function) {
        return func;
      }

      if (typeof func === "string") {
        if (window[func] instanceof Function) {
          return window[func];
        }

        if (func.includes(".")) {
          try {
            return func.split(".").reduce(function (obj, i) {
              return obj[i];
            }, window);
          } catch (e) {}
        }

        try {
          if (eval(`${func} instanceof Function`)) {
            return eval(func);
          }
        } catch (e) {}
      }

      return undefined;
    }

    addCustomValidityEvents(event) {
      this.customValidityEvents.push(event);
    }

    addError(message) {
      this.errors.push(message);
    }

    addInvalidFeedback() {
      this.removeInvalidFeedback();

      this.$element.addClass("is-invalid");
      this.isInputGroup && this.$after.addClass("is-invalid");

      /* Invalid feedback should only be applied to the last Radio element */
      if (
        this.element.type === "radio" &&
        $(`[name="${this.element.name}"]`).last().get(0) !== this.element
      ) {
        return;
      }

      const feedback = this.errors.reduce(function (messages, message) {
        return `${messages}<li>${message}</li>`;
      }, "");
      const isInlineCheckboxClass =
        this.$element.parent(".form-check-inline, .custom-control-inline")
          .length > 0
          ? "mt-0 ml-2"
          : "";

      this.$after.nextAll().addBack().last().after(`
        <div class="invalid-feedback ${isInlineCheckboxClass}">
          <ul class="list-unstyled mb-0">
            ${feedback}
          </ul>
        </div>
      `);
    }

    checkValidity() {
      this.resetErrors();
      this.triggerCustomValidityEvents();

      if (this.element.checkValidity()) {
        return true;
      }

      if (this.element.validity.badInput) {
        this.addError(
          this.element.type === "number"
            ? "is not a valid number"
            : "is a bad input"
        );
      }

      if (this.element.validity.patternMismatch) {
        this.addError(
          this.options.patternMismatchErrorMessage || "is not pattern-matched"
        );
      }

      if (this.element.validity.rangeOverflow) {
        this.addError(`is over the maximum value of ${this.element.max}`);
      }

      if (this.element.validity.rangeUnderflow) {
        this.addError(`is under the minimum value of ${this.element.min}`);
      }

      if (this.element.validity.stepMismatch) {
        this.addError(`is not in the step of ${this.element.step}`);
      }

      if (this.element.validity.tooLong) {
        this.addError(
          `is over the maximum charcters of ${this.$element.attr("maxlength")}`
        );
      }

      /**
       * `validity.tooShort` works only for user input. However, if `options.autoTrim` is enabled,
       * input value is programming set by `trim()` and  make `validity.tooShort` always ignored.
       * To work around this, we'll use `minLengthHelper` instead when `options.autoTrim` is enabled.
       */
      if (!this.options.autoTrim && this.element.validity.tooShort) {
        this.addError(
          `is under the minimum charcters of ${this.$element.attr("minlength")}`
        );
      }

      if (this.element.validity.typeMismatch) {
        this.addError(
          `is not a valid ${this.element.type.toUpperCase()} format`
        );
      }

      if (this.element.validity.valueMissing) {
        this.addError("is required");
      }

      return false;
    }

    clear() {
      this.$element.val("");
    }

    hasErrors() {
      return this.errors.length > 0;
    }

    hideHint() {
      if (this.options.hintOnFocus) {
        this.$after.nextAll(".bs-validate-hint").addClass("d-none");
      }
    }

    prop(propertyName, value) {
      this.$element.prop(propertyName, value);
    }

    removeInvalidFeedback() {
      this.$element.removeClass("is-invalid");
      this.isInputGroup && this.$after.removeClass("is-invalid");
      this.$after.nextAll(".invalid-feedback").remove();
    }

    removeSpinner() {
      this.$spinner?.remove();
    }

    reportValidity() {
      const isValid = this.checkValidity();

      if (isValid) {
        this.removeInvalidFeedback();
      } else {
        this.addInvalidFeedback();
      }

      return isValid;
    }

    resetErrors() {
      this.errors = [];
    }

    showHint() {
      this.$after.nextAll(".bs-validate-hint").removeClass("d-none");
    }

    showSpinner() {
      if (this.isFormCheck) {
        return;
      }

      this.removeSpinner();

      let top = -1 - this.$element.height();
      let right = 16;
      let zIndex = this.element.style.zIndex + 3;

      if (this.isInputGroup) {
        right += this.$element.next(".input-group-append").width();
      }

      if (this.element.tagName === "TEXTAREA") {
        top = 12 - this.$element.outerHeight();
      }

      if (this.element.tagName === "SELECT") {
        right += 12;
      } else if (this.element.type === "date") {
        right += 20;
      }

      this.$spinner = $(`
        <div class="form-text bs-spinner position-relative float-right"
             style="line-height: 0; right: ${right}px; margin-top: ${top}px; z-index: ${zIndex};">
          <div class="spinner-border spinner-border-sm ${this.options.spinnerClass}"
               style="height: .8rem; width: .8rem;"></div>
        </div>
      `);

      this.$after.after(this.$spinner);
    }

    toggleLabelRequired() {
      if (!this.$label?.length) {
        return;
      }

      const isRequired = this.$element.prop("required");

      if (isRequired) {
        this.$label.addClass("required");
      } else {
        this.$label.removeClass("required");
      }
    }

    triggerCustomValidityEvents() {
      if (!this.customValidityEvents.length) {
        return;
      }

      this.customValidityEvents.forEach(function (event) {
        this.$element.trigger(event);
      }, this);
    }

    trim(checkValidity = true) {
      this.$element.val(this.$element.val().trim());
      checkValidity && this.checkValidity();
    }

    val() {
      return this.$element.val();
    }
  }

  BootstrapValidate.Helpers = {
    alphanumericHelper: function (self) {
      if (self.element.tagName !== "INPUT") {
        return;
      }

      const helperEventName = "helper:alphanumeric";
      const errorMessage = "is not alphanumeric characters only";

      self.addCustomValidityEvents(helperEventName);

      self.$element.on(helperEventName, function () {
        const text = self.val();

        if (!text || text.search(/[^a-zA-Z0-9]/) < 0) {
          self.element.setCustomValidity("");
        } else {
          self.element.setCustomValidity(errorMessage);
          self.addError(errorMessage);
        }
      });
    },
    emailDomainHelper: function (self) {
      if (self.element.type !== "email") {
        return;
      }

      const helperEventName = "helper:email-domain";
      const errorMessage = "is not ending with a valid TLD Domain";

      self.addCustomValidityEvents(helperEventName);

      self.$element.on(helperEventName, function () {
        const email = self.val();

        if (!email || email.match(/@.+?\.[a-zA-Z0-9]{2,}$/) !== null) {
          self.element.setCustomValidity("");
        } else {
          self.element.setCustomValidity(errorMessage);
          self.addError(errorMessage);
        }
      });
    },
    maxLengthHelper: function (self) {
      if (self.element.tagName !== "INPUT") {
        return;
      }

      const helperEventName = "helper:max-length";
      const maxLength = self.element.getAttribute("maxLength");

      if (!maxLength) {
        return;
      }

      const $maxLengthHelper = $(`
        <div class="form-text ${self.options.helperClass} small d-none mb-0 bs-validate-helper" helper="maxLength">
          <span class="length">${maxLength}</span> character(s) remaining...
        </div>
      `);

      self.$after.after($maxLengthHelper);

      self.$element.on({
        [`input ${helperEventName}`]: function () {
          const currentLength = self.val().length ?? 0;
          $maxLengthHelper.find(".length").text(maxLength - currentLength);
        },
        focus: function () {
          self.$element.trigger(helperEventName);
          $maxLengthHelper.removeClass("d-none");
        },
        blur: function () {
          $maxLengthHelper.addClass("d-none");
        },
      });
    },
    minLengthHelper: function (self) {
      if (self.element.tagName !== "INPUT") {
        return;
      }

      const minLength = self.element.getAttribute("minLength");

      if (!minLength) {
        return;
      }

      const regex = new RegExp(`.{${minLength},}`);
      const helperEventName = "helper:min-length";
      const errorMessage = `is under the minimum charcters of ${minLength}`;

      self.addCustomValidityEvents(helperEventName);

      self.$element.on(helperEventName, function () {
        const text = self.val();

        if (!text || text.match(regex) !== null) {
          self.element.setCustomValidity("");
        } else {
          self.element.setCustomValidity(errorMessage);
          self.addError(errorMessage);
        }
      });
    },
  };

  $.fn.bsValidate = function (options) {
    const supportedInputTypes = [
      "checkbox",
      "date",
      "email",
      "number",
      "radio",
      "text",
    ];

    return this.each(function () {
      if (
        (this.tagName === "INPUT" && supportedInputTypes.includes(this.type)) ||
        this.tagName === "SELECT" ||
        this.tagName === "TEXTAREA"
      ) {
        const htmlOptions = $(this).data() || {};
        const settings = $.extend(
          {},
          $.fn.bsValidate.defaults,
          htmlOptions,
          options
        );

        new BootstrapValidate(this, settings);
      }
    });
  };

  $.fn.bsValidate.defaults = {
    alphanumericHelper: false,
    autoTrim: true,
    emailDomainHelper: false,
    helperClass: "text-info",
    hint: "",
    hintClass: "text-muted",
    hintOnFocus: false,
    maxLengthHelper: false,
    onBlur: null,
    onFocus: null,
    onInput: null,
    onReset: null,
    onSubmit: null,
    onValid: null,
    onValidDebounce: 700,
    patternMismatchErrorMessage: "",
    spinnerClass: "text-primary",
  };

  $(function () {
    $(".bs-validate").bsValidate();
  });
})(jQuery);
