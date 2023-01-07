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
      this._observer = null;
      this._timeoutId = null;

      this._addListeners();
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
        report: function (event) {
          event.stopImmediatePropagation();
          self.reportValidity();
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

    _startObserver() {
      this._observer = new MutationObserver(this._houseKeeping.bind(this));
      this._observer.observe(this.element, { attributeFilter: ["required"] });
    }

    _houseKeeping(mutations) {
      const self = this;

      mutations.forEach(function (mutation) {
        switch (mutation.type) {
          case "attributes":
            switch (mutation.attributeName) {
              case "required":
                self.toggleLabelRequired();
                break;
            }
            break;
        }
      });
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

    addError(message) {
      this.errors.push(message);
    }

    addHelperValidityEvents(event) {
      this.helperValidityEvents.push(event);
    }

    addInvalidFeedback() {
      this.removeInvalidFeedback();

      this.$element.addClass("is-invalid");

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
        this.$element.parent(".form-check-inline").length > 0
          ? "mt-0 ml-2"
          : "";

      this.$element.parent().append(`
        <div class="invalid-feedback ${isInlineCheckboxClass}">
          <ul class="list-unstyled mb-0">
            ${feedback}
          </ul>
        </div>
      `);
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

    clear() {
      this.$element.val("");
    }

    hasErrors() {
      return this.errors.length > 0;
    }

    hideHint() {
      if (this.options.hintOnFocus) {
        this.$element.nextAll(".bs-validate-hint").addClass("d-none");
      }
    }

    prop(propertyName, value) {
      this.$element.prop(propertyName, value);
    }

    removeInvalidFeedback() {
      this.$element
        .removeClass("is-invalid")
        .nextAll(".invalid-feedback")
        .remove();
    }

    removeSpinner() {
      this.$element.nextAll(".bs-spinner").remove();
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
      this.$element.nextAll(".bs-validate-hint").removeClass("d-none");
    }

    showSpinner() {
      const top = this.$element.hasClass("form-control-sm") ? "-21px" : "-25px";
      const right = this.element.tagName === "INPUT" ? "16px" : "28px";

      this.removeSpinner();
      this.$element.after(`
        <div class="form-text bs-spinner position-relative float-right" style="line-height: 0; right: ${right}; margin-top: ${top};">
          <div class="spinner-border spinner-border-sm ${this.options.spinnerClass}"
               style="height: .8rem; width: .8rem;"></div>
        </div>
      `);
    }

    toggleLabelRequired() {
      const isRequired = this.$element.prop("required");
      let $label = this.$element.prev("label, legend");

      if (!$label.length) {
        $label = this.$element
          .parents(".form-group, .form-row, .row")
          .first()
          .find("label, legend")
          .first();
      }

      if (!$label.length && this.element.id) {
        $label = $(`label[for="${this.element.id}"]`);
      }

      if (!$label.length) {
        return;
      }

      if (isRequired) {
        $label.addClass("required");
      } else {
        $label.removeClass("required");
      }
    }

    triggerHelperValidityEvents() {
      const self = this;

      if (self.helperValidityEvents.length) {
        self.helperValidityEvents.forEach(function (event) {
          self.$element.trigger(event);
        });
      }
    }

    trim() {
      this.$element.val(this.$element.val().trim());
    }

    val() {
      return this.$element.val();
    }
  }

  BootstrapValidate.Helpers = {
    emailDomainHelper: function (self) {
      if (self.element.type !== "email") {
        return;
      }

      const helperEventName = "helper:email-domain";
      const errorMessage = "is not ending with a valid TLD Domain";

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
