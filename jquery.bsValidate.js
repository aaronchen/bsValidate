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
 * @param {boolean} options.autoTrim - Auto-trim input value (default: true)
 * @param {boolean} options.emailDomainHelper - Enable Email Domain helper (default: false)
 * @param {string} options.helperClass - Bootstrap class for displaying Helpers (default: "text-info")
 * @param {string} options.hint - Hint
 * @param {string} options.hintClass - Bootstrap class for displaying Hint (default: "text-muted")
 * @param {boolean} options.hintOnFocus - Only show Hint on `focus` (default: false)
 * @param {boolean} options.maxLengthHelper - Enable maxLength helper (default: false)
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
      this.errors = [];
      this.helperValidityEvents = [];
      this.onBlur = this._toFunction(options.onBlur);
      this.onFocus = this._toFunction(options.onFocus);
      this.onInput = this._toFunction(options.onInput);
      this.onReset = this._toFunction(options.onReset);
      this.onSubmit = this._toFunction(options.onSubmit);
      this.onValid = null;
      this._timeoutId = null;

      this._addListeners();
      this._addHint();
      this._wrapOnValid();
      this._addHelpers();
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
            self.onValid();
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
        reset: function (event) {
          event.stopImmediatePropagation();
          self.clear();
          self.resetErrors();
          self.hideHint();
          self.removeInvalidFeedback();
          self.onReset instanceof Function && self.onReset(self);
        },
        submit: function (event) {
          event.stopImmediatePropagation();

          if (self.options.autoTrim) {
            self.trim();
          }

          self.reportValidity();
          self.onSubmit instanceof Function && self.onSubmit(self);
        },
      });
    }

    _addHint() {
      if (!this.options.hint) {
        return;
      }

      const hintVisibility = this.options.hintOnFocus ? "d-none" : "";

      this.$element.after(`
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

      self.onValid = function () {
        clearTimeout(self._timeoutId);
        self._timeoutId = setTimeout(
          onValid,
          self.options.onValidDebounce,
          self
        );
      };
    }

    _addHelpers() {
      this.options.emailDomainHelper &&
        BootstrapValidate.Helpers.emailDomainHelper(this);
      this.options.maxLengthHelper &&
        BootstrapValidate.Helpers.maxLengthHelper(this);
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

    clear() {
      this.$element.val("");
    }

    val() {
      return this.$element.val();
    }

    trim() {
      this.$element.val(this.$element.val().trim());
    }

    prop(propertyName, value) {
      this.$element.prop(propertyName, value);
    }

    showHint() {
      this.$element.nextAll(".bs-validate-hint").removeClass("d-none");
    }

    hideHint() {
      if (this.options.hintOnFocus) {
        this.$element.nextAll(".bs-validate-hint").addClass("d-none");
      }
    }

    addError(message) {
      this.errors.push(message);
    }

    hasErrors() {
      return this.errors.length > 0;
    }

    resetErrors() {
      this.errors = [];
    }

    addHelperValidityEvents(event) {
      this.helperValidityEvents.push(event);
    }

    triggerHelperValidityEvents() {
      const self = this;

      if (self.helperValidityEvents.length) {
        self.helperValidityEvents.forEach(function (event) {
          self.$element.trigger(event);
        });
      }
    }

    addInvalidFeedback() {
      this.removeInvalidFeedback();

      const feedback = this.errors.reduce(function (messages, message) {
        return `${messages}<li>${message}</li>`;
      }, "");

      this.$element.addClass("is-invalid").parent().append(`
        <div class="invalid-feedback">
          <ul class="list-unstyled mb-0">
            ${feedback}
          </ul>
        </div>
      `);
    }

    removeInvalidFeedback() {
      this.$element
        .removeClass("is-invalid")
        .nextAll(".invalid-feedback")
        .remove();
    }

    checkValidity() {
      const self = this;

      self.resetErrors();
      self.triggerHelperValidityEvents();

      if (self.element.checkValidity()) {
        return true;
      }

      if (self.element.validity.badInput) {
        self.addError(
          self.element.type === "number"
            ? "is not a valid number"
            : "is a bad input"
        );
      }

      if (self.element.validity.patternMismatch) {
        self.addError(
          self.options.patternMismatchErrorMessage || "is not pattern-matched"
        );
      }

      if (self.element.validity.rangeOverflow) {
        self.addError(`is over the maximum value of ${self.element.max}`);
      }

      if (self.element.validity.rangeUnderflow) {
        self.addError(`is under the minimum value of ${self.element.min}`);
      }

      if (self.element.validity.stepMismatch) {
        self.addError(`is not in the step of ${self.element.step}`);
      }

      if (self.element.validity.tooLong) {
        self.addError(
          `is over the maximum charcters of ${self.$element.attr("maxlength")}`
        );
      }

      if (self.element.validity.tooShort) {
        self.addError(
          `is under the minimum charcters of ${self.$element.attr("minlength")}`
        );
      }

      if (self.element.validity.typeMismatch) {
        self.addError(
          `is not a valid ${self.element.type.toUpperCase()} format`
        );
      }

      if (self.element.validity.valueMissing) {
        self.addError("is required");
      }

      return false;
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

    showSpinner() {
      const top = this.$element.hasClass("form-control-sm") ? "-21px" : "-25px";
      this.removeSpinner();
      this.$element.after(`
        <div class="form-text bs-spinner position-relative float-right" style="line-height: 0; right: 16px; margin-top: ${top};">
          <div class="spinner-border spinner-border-sm ${this.options.spinnerClass}"
               style="height: .8rem; width: .8rem;"></div>
        </div>
      `);
    }

    removeSpinner() {
      this.$element.nextAll(".bs-spinner").remove();
    }
  }

  BootstrapValidate.Helpers = {
    emailDomainHelper: function (self) {
      const helperEventName = "helper:email-domain";
      const errorMessage = "is not ending with a valid TLD Domain";

      if (self.element.type !== "email") {
        return;
      }

      self.addHelperValidityEvents(helperEventName);

      self.$element.on(helperEventName, function () {
        const email = self.val();

        if (!email || email.match(/.+?\.[a-zA-Z0-9]{2,}$/) !== null) {
          self.element.setCustomValidity("");
        } else {
          self.element.setCustomValidity(errorMessage);
          self.addError(errorMessage);
        }
      });
    },
    maxLengthHelper: function (self) {
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

      self.$element.after($maxLengthHelper);

      self.$element.on(`input ${helperEventName}`, function () {
        const currentLength = self.val().length ?? 0;
        $maxLengthHelper.find(".length").text(maxLength - currentLength);
      });

      self.$element.on("focus", function () {
        self.$element.trigger(helperEventName);
        $maxLengthHelper.removeClass("d-none");
      });

      self.$element.on("blur", function () {
        $maxLengthHelper.addClass("d-none");
      });
    },
  };

  $.fn.bsValidate = function (options) {
    return this.each(function () {
      if (this.tagName === "INPUT") {
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
