(() => {
  const title = document.getElementById('a0TagTitle');
  const message = document.getElementById('a0TagMessage');
  const actions = document.getElementById('a0TagActions');
  const copy = document.getElementById('a0TagCopy');
  const dismiss = document.getElementById('a0TagDismiss');
  const result = document.getElementById('a0TagResult');
  const composer = document.getElementById('a0TagComposer');
  const composerClose = document.getElementById('a0TagComposerClose');
  const profile = document.getElementById('a0TagProfile');
  const query = document.getElementById('a0TagQuery');
  const attachmentTrigger = document.getElementById('a0TagAttachmentTrigger');
  const attachmentMenu = document.getElementById('a0TagAttachmentMenu');
  const attachFile = document.getElementById('a0TagAttachFile');
  const attachFolder = document.getElementById('a0TagAttachFolder');
  const attachmentSummary = document.getElementById('a0TagAttachmentSummary');
  const attachmentSummaryText = document.getElementById('a0TagAttachmentSummaryText');
  const attachmentClear = document.getElementById('a0TagAttachmentClear');
  const microphone = document.getElementById('a0TagMicrophone');
  const microphoneStatus = document.getElementById('a0TagMicrophoneStatus');
  const submit = document.getElementById('a0TagSubmit');
  const toast = document.getElementById('a0TagToast');
  const toastTitle = document.getElementById('a0TagToastTitle');
  const toastMessage = document.getElementById('a0TagToastMessage');
  let toastTimer = null;

  const openIntent = (host, params) => {
    const search = params ? `?${params.toString()}` : '';
    window.location.href = `a0-tag-compose://${host}${search}`;
  };

  const setMicrophoneActive = (active) => {
    microphone.dataset.active = String(active);
    microphone.setAttribute('aria-pressed', String(active));
    microphone.setAttribute('aria-label', active ? 'Stop voice input' : 'Start voice input');
  };

  const showToast = (value, heading = 'Whisper STT') => {
    clearTimeout(toastTimer);
    const text = String(value || '').trim();
    toastTitle.textContent = String(heading || 'Agent Zero');
    toastMessage.textContent = text;
    toast.hidden = !text;
    composer.dataset.toast = String(Boolean(text));
    if (text) toastTimer = setTimeout(() => {
      toast.hidden = true;
      composer.dataset.toast = 'false';
    }, 6000);
  };

  const closeAttachmentMenu = () => {
    attachmentMenu.hidden = true;
    attachmentTrigger.setAttribute('aria-expanded', 'false');
  };

  const setAttachmentMenuOpen = (open) => {
    attachmentMenu.hidden = !open;
    attachmentTrigger.setAttribute('aria-expanded', String(open));
    openIntent(open ? 'attachments-menu-open' : 'attachments-menu-close');
  };

  const setMicrophoneStatus = (value) => {
    const text = String(value || '').trim();
    microphoneStatus.textContent = text;
    microphoneStatus.hidden = !text;
    composer.dataset.microphoneStatus = String(Boolean(text));
  };

  window.closeA0TagAttachmentMenu = closeAttachmentMenu;

  window.renderA0TagOverlay = (payload = {}) => {
    document.body.dataset.view = 'result';
    document.body.dataset.kind = ['working', 'success', 'warning', 'error'].includes(payload.kind)
      ? payload.kind
      : 'working';
    result.hidden = false;
    composer.hidden = true;
    title.textContent = String(payload.title || 'A0 Tag');
    message.textContent = String(payload.message || '');
    actions.hidden = payload.interactive !== true;
    copy.hidden = payload.copyable !== true;
  };

  window.renderA0TagComposer = (payload = {}) => {
    document.body.dataset.view = 'composer';
    result.hidden = true;
    composer.hidden = false;
    profile.replaceChildren();
    for (const item of Array.isArray(payload.profiles) ? payload.profiles : []) {
      const option = document.createElement('option');
      option.value = String(item?.key || '');
      option.textContent = String(item?.label || item?.key || '');
      option.selected = option.value === String(payload.selectedProfile || '');
      profile.append(option);
    }
    query.value = '';
    query.removeAttribute('aria-invalid');
    submit.disabled = true;
    setMicrophoneActive(false);
    setMicrophoneStatus('');
    closeAttachmentMenu();
    attachmentSummary.hidden = true;
    attachmentSummaryText.textContent = '';
    showToast('');
    requestAnimationFrame(() => query.focus());
  };

  window.renderA0TagMicrophone = (payload = {}) => {
    setMicrophoneActive(false);
    setMicrophoneStatus('');
    if (payload.error) {
      showToast(payload.error);
      return;
    }
    showToast('');
    const text = String(payload.text || '').trim();
    if (!text) return;
    query.value = text;
    query.dispatchEvent(new Event('input', { bubbles: true }));
    query.focus();
    if (payload.sendImmediately === true) requestAnimationFrame(() => composer.requestSubmit());
  };

  window.renderA0TagMicrophoneStatus = (payload = {}) => {
    if (payload.error) {
      setMicrophoneStatus('');
      showToast(payload.error, 'Whisper STT');
      return;
    }
    setMicrophoneStatus(payload.message);
  };

  window.renderA0TagAttachments = (payload = {}) => {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const first = items[0];
    const firstLabel = first
      ? `${String(first.label || 'Attachment')}${first.kind === 'folder' ? ' /' : ''}`
      : '';
    attachmentSummaryText.textContent = items.length > 1 ? `${firstLabel} +${items.length - 1}` : firstLabel;
    attachmentSummary.hidden = !items.length;
    if (payload.error) showToast(payload.error, 'Attachments');
  };

  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    const request = query.value.trim();
    if (!request || !profile.value) {
      query.setAttribute('aria-invalid', 'true');
      query.focus();
      return;
    }
    submit.disabled = true;
    openIntent('submit', new URLSearchParams({ query: request, profile: profile.value }));
  });

  query.addEventListener('input', () => {
    const codepoints = Array.from(query.value);
    if (codepoints.length > 2048) query.value = codepoints.slice(0, 2048).join('');
    query.removeAttribute('aria-invalid');
    submit.disabled = !query.value.trim();
  });

  query.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    composer.requestSubmit();
  });

  microphone.addEventListener('click', () => {
    const active = microphone.dataset.active === 'true';
    setMicrophoneActive(!active);
    if (active) setMicrophoneStatus('');
    showToast('');
    openIntent(active ? 'microphone-cancel' : 'microphone');
  });

  attachmentTrigger.addEventListener('click', () => setAttachmentMenuOpen(attachmentMenu.hidden));
  attachFile.addEventListener('click', () => openIntent('attach-file'));
  attachFolder.addEventListener('click', () => openIntent('attach-folder'));
  attachmentClear.addEventListener('click', () => openIntent('attachments-clear'));
  document.addEventListener('pointerdown', (event) => {
    if (attachmentMenu.hidden || event.target.closest('.a0-tag-attachment-wrapper')) return;
    setAttachmentMenuOpen(false);
  });

  composerClose.addEventListener('click', () => openIntent('cancel'));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || document.body.dataset.view !== 'composer') return;
    if (!attachmentMenu.hidden) {
      setAttachmentMenuOpen(false);
      return;
    }
    openIntent('cancel');
  });

  copy.addEventListener('click', () => { window.location.href = 'a0-tag-overlay://copy'; });
  dismiss.addEventListener('click', () => { window.location.href = 'a0-tag-overlay://dismiss'; });
})();
