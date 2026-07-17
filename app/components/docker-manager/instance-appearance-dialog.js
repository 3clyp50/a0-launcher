import {
  INSTANCE_COLOR_OPTIONS,
  INSTANCE_ICON_OPTIONS,
  normalizedInstanceColorId,
  normalizedInstanceIconId
} from "./card-visuals.js";

function closeDialog(dialog) {
  dialog?.remove();
  window.dockerManagerActions?.syncInstanceTabBounds?.();
}

function setSelected(container, selector, value, attribute) {
  container.querySelectorAll(selector).forEach((button) => {
    const selected = button.dataset[attribute] === value;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function openInstanceAppearanceDialog({ title, currentColor, currentIcon, onSave }) {
  closeDialog(document.getElementById("instanceAppearanceDialog"));

  let color = normalizedInstanceColorId(currentColor);
  let icon = normalizedInstanceIconId(currentIcon);
  const dialog = document.createElement("div");
  dialog.id = "instanceAppearanceDialog";
  dialog.className = "dm-dialog-backdrop";
  dialog.setAttribute("role", "presentation");
  dialog.innerHTML = `
    <div class="dm-dialog dm-appearance-dialog" role="dialog" aria-modal="true" aria-labelledby="instanceAppearanceTitle">
      <div class="dm-dialog-header">
        <h2 id="instanceAppearanceTitle" class="dm-dialog-title"></h2>
        <button class="button dm-dialog-close" type="button" data-close aria-label="Close">×</button>
      </div>
      <div class="dm-dialog-body dm-appearance-body">
        <section class="dm-appearance-section" aria-labelledby="instanceIconLabel">
          <div id="instanceIconLabel" class="dm-field-label">Icon</div>
          <div class="dm-icon-options"></div>
        </section>
        <section class="dm-appearance-section" aria-labelledby="instanceColourLabel">
          <div id="instanceColourLabel" class="dm-field-label">Colour</div>
          <div class="dm-color-swatches"></div>
        </section>
      </div>
      <div class="dm-dialog-footer">
        <button class="button" type="button" data-close>Cancel</button>
        <button class="button confirm" type="button" data-save>Save</button>
      </div>
    </div>`;

  dialog.querySelector("#instanceAppearanceTitle").textContent = title || "Instance Colour/Icon";
  const iconOptions = dialog.querySelector(".dm-icon-options");
  for (const option of INSTANCE_ICON_OPTIONS) {
    const button = document.createElement("button");
    button.className = `dm-icon-option${option.id === icon ? " is-selected" : ""}`;
    button.type = "button";
    button.dataset.icon = option.id;
    button.setAttribute("aria-label", option.label);
    button.setAttribute("aria-pressed", String(option.id === icon));
    button.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${option.icon || option.id}</span><span>${option.label}</span>`;
    button.addEventListener("click", () => {
      icon = option.id;
      setSelected(iconOptions, ".dm-icon-option", icon, "icon");
    });
    iconOptions.appendChild(button);
  }

  const colorOptions = dialog.querySelector(".dm-color-swatches");
  for (const option of INSTANCE_COLOR_OPTIONS) {
    const colorId = normalizedInstanceColorId(option.id);
    const button = document.createElement("button");
    button.className = `dm-color-swatch-option${colorId === color ? " is-selected" : ""}`;
    button.type = "button";
    button.dataset.color = colorId;
    button.setAttribute("aria-pressed", String(colorId === color));

    const swatch = document.createElement("span");
    swatch.className = `dm-color-swatch${colorId ? "" : " is-auto"}`;
    swatch.style.setProperty("--dm-swatch-fg", option.fg);
    swatch.style.setProperty("--dm-swatch-bg", option.bg);
    swatch.style.setProperty("--dm-swatch-border", option.border);

    const label = document.createElement("span");
    label.className = "dm-color-swatch-label";
    label.textContent = option.label;
    button.append(swatch, label);
    button.addEventListener("click", () => {
      color = colorId;
      setSelected(colorOptions, ".dm-color-swatch-option", color, "color");
    });
    colorOptions.appendChild(button);
  }

  const close = () => closeDialog(dialog);
  dialog.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", close));
  dialog.addEventListener("mousedown", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  dialog.querySelector("[data-save]").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    if (await onSave?.({ color, icon }) !== false) close();
    else button.disabled = false;
  });

  window.dockerManagerActions?.hideInstanceTabView?.();
  document.body.appendChild(dialog);
  window.setTimeout(() => dialog.querySelector(`.dm-icon-option[data-icon="${icon}"]`)?.focus(), 0);
}

export { openInstanceAppearanceDialog };
