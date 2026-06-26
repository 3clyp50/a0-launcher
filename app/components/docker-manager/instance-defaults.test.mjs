import assert from 'node:assert/strict';
import { test } from 'node:test';

const {
  PRIMARY_INSTANCE_MODEL_SLOTS,
  applyInstanceDefaultsToForm,
  bindInstanceDefaultProviderPlaceholderSync,
  instanceModelRowsHtml,
  providerApiKeyPlaceholder
} = await import('./instance-defaults.js');

class FakeSelect extends EventTarget {
  constructor(value = '') {
    super();
    this.dataset = {};
    this.value = value;
  }
}

function fakeRoot(elements) {
  return {
    querySelector(selector) {
      return elements.get(selector) || null;
    }
  };
}

test('API key placeholder uses the selected provider label', () => {
  const slot = PRIMARY_INSTANCE_MODEL_SLOTS[0];

  assert.equal(providerApiKeyPlaceholder(slot, 'openrouter'), 'OpenRouter API key');
  assert.equal(providerApiKeyPlaceholder(slot, 'anthropic'), 'Anthropic API key');
  assert.equal(providerApiKeyPlaceholder(slot, 'a0_venice'), 'Agent Zero API key');
  assert.equal(providerApiKeyPlaceholder(slot, 'other'), 'Provider API key');
});

test('model row HTML renders provider-specific API key placeholders', () => {
  const html = instanceModelRowsHtml(PRIMARY_INSTANCE_MODEL_SLOTS, {
    models: {
      Main: { provider: 'anthropic', model: '', apiKey: '' },
      Utility: { provider: 'openai', model: '', apiKey: '' }
    }
  }, 'settings');

  assert.match(html, /placeholder="Anthropic API key"/);
  assert.match(html, /placeholder="OpenAI API key"/);
});

test('API key placeholder follows provider changes', () => {
  const provider = new FakeSelect('openrouter');
  const apiKey = { placeholder: '' };
  const root = fakeRoot(new Map([
    ['#testMainProvider', provider],
    ['#testMainApiKey', apiKey]
  ]));

  bindInstanceDefaultProviderPlaceholderSync(root, 'test');
  assert.equal(apiKey.placeholder, 'OpenRouter API key');

  provider.value = 'anthropic';
  provider.dispatchEvent(new Event('change'));
  assert.equal(apiKey.placeholder, 'Anthropic API key');
});

test('applying saved defaults refreshes API key placeholders', () => {
  const provider = { dataset: {}, value: 'openrouter' };
  const model = { dataset: {}, value: '' };
  const apiKey = { dataset: {}, placeholder: '', value: '' };
  const root = fakeRoot(new Map([
    ['#testMainProvider', provider],
    ['#testMainModel', model],
    ['#testMainApiKey', apiKey]
  ]));

  applyInstanceDefaultsToForm(root, 'test', {
    models: {
      Main: { provider: 'google', model: 'gemini-test', apiKey: '' }
    }
  });

  assert.equal(provider.value, 'google');
  assert.equal(model.value, 'gemini-test');
  assert.equal(apiKey.placeholder, 'Google Gemini API key');
});
