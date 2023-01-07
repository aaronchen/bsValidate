# bsValidate

```javascript
$(".bs-validate").bsValidate();
```

## bsValidate Options

- **Parameters:**

  - `options` — `Object`
  - `options.autoTrim` — `boolean` — Auto-trim input value (default: true)
  - `options.emailDomainHelper` — `boolean` — Enable Email Domain helper (default: false)
  - `options.helperClass` — `string` — Bootstrap class for displaying Helpers (default: "text-info")
  - `options.hint` — `string` — Hint
  - `options.hintClass` — `string` — Bootstrap class for displaying Hint (default: "text-muted")
  - `options.hintOnFocus` — `boolean` — Only show Hint on `focus` (default: false)
  - `options.maxLengthHelper` — `boolean` — Enable maxLength helper (default: false)
  - `options.onBlur` — `function(BootstrapValidate): void` - On `blur` callback
  - `options.onFocus` — `function(BootstrapValidate): void` - On `focus` callback
  - `options.onInput` — `function(BootstrapValidate): void` - On `input` callback
  - `options.onReset` — `function(BootstrapValidate): void` - On `reset` callback
  - `options.onSubmit` — `function(BootstrapValidate): void` - On `submit` callback
  - `options.onValid` — `function(BootstrapValidate): void` - On valid `input` callback
  - `options.onValidDebounce` — `number` — Debounce for valid `input` callback (default: 700)
  - `options.patternMismatchErrorMessage` — `string` — Custom invalid message for pattern mismatch
  - `options.spinnerClass` — `string` — Bootstrap class for displaying Spinner (default: "text-primary")

  ## bsValidate Sample

  [Sample](https://aaronchen.github.io/bsValidate/)
