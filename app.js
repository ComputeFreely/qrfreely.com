(function () {
  "use strict";

  var currentType = "url";
  var logoDataUrl = "";
  var latestSvg = "";
  var latestPayload = "";
  var latestFileBase = "qrfreely-code";
  var renderTimer = 0;
  var maxLogoSize = 24;
  var defaultLogoSize = 16;
  var maxLogoPadding = 40;
  var defaultLogoPadding = 18;
  var maxLogoBytes = 2 * 1024 * 1024;

  var presets = {
    ink: {
      foregroundColor: "#141414",
      gradientColor: "#141414",
      backgroundColor: "#ffffff",
      eyeColor: "#111827",
      borderColor: "#111827",
      labelColor: "#111827",
      useGradient: false,
      dotStyle: "square",
      eyeStyle: "rounded"
    },
    ocean: {
      foregroundColor: "#0f766e",
      gradientColor: "#2563eb",
      backgroundColor: "#f8fafc",
      eyeColor: "#063b36",
      borderColor: "#0f766e",
      labelColor: "#063b36",
      useGradient: true,
      dotStyle: "rounded",
      eyeStyle: "rounded"
    },
    sunrise: {
      foregroundColor: "#b4234f",
      gradientColor: "#f59e0b",
      backgroundColor: "#fff7ed",
      eyeColor: "#7f1d1d",
      borderColor: "#b4234f",
      labelColor: "#7f1d1d",
      useGradient: true,
      dotStyle: "dot",
      eyeStyle: "rounded"
    },
    forest: {
      foregroundColor: "#1f5132",
      gradientColor: "#6b8e23",
      backgroundColor: "#fbfff7",
      eyeColor: "#173923",
      borderColor: "#3b7a57",
      labelColor: "#173923",
      useGradient: false,
      dotStyle: "rounded",
      eyeStyle: "rounded"
    },
    tron: {
      foregroundColor: "#00ffff",
      gradientColor: "#00c8c8",
      backgroundColor: "#000011",
      eyeColor: "#00ff00",
      borderColor: "#00ffff",
      labelColor: "#ffbb00",
      useGradient: true,
      dotStyle: "square",
      eyeStyle: "rounded"
    }
  };

  var $ = function (selector) {
    return document.querySelector(selector);
  };

  var $$ = function (selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  };

  document.addEventListener("DOMContentLoaded", function () {
    setDefaultEventTimes();
    bindEvents();
    syncRangeLabels();
    render();
  });

  function bindEvents() {
    $$(".type-card").forEach(function (button) {
      button.addEventListener("click", function () {
        setType(button.dataset.type);
      });
      button.addEventListener("keydown", handleTypeKeydown);
    });

    $("#qrForm").addEventListener("input", scheduleRender);
    $("#qrForm").addEventListener("change", function (event) {
      if (event.target.id === "logoUpload") {
        readLogo(event.target.files && event.target.files[0]);
        return;
      }
      if (event.target.id === "wifiSecurity") {
        toggleWifiPassword();
      }
      syncRangeLabels();
      scheduleRender();
    });

    $$(".preset").forEach(function (button) {
      button.addEventListener("click", function () {
        applyPreset(button.dataset.preset);
      });
    });

    $("#downloadPng").addEventListener("click", downloadPng);
    $("#downloadSvg").addEventListener("click", downloadSvg);
    $("#copyPayload").addEventListener("click", copyPayload);
    $("#resetAll").addEventListener("click", resetAll);
    $("#clearLogo").addEventListener("click", clearLogo);
  }

  function setType(type) {
    currentType = type;

    $$(".type-card").forEach(function (button) {
      var isActive = button.dataset.type === type;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    $$(".payload-panel").forEach(function (panel) {
      var isActive = panel.dataset.panel === type;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });

    scheduleRender();
  }

  function handleTypeKeydown(event) {
    var keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (keys.indexOf(event.key) === -1) {
      return;
    }

    event.preventDefault();
    var buttons = $$(".type-card");
    var index = buttons.indexOf(event.currentTarget);
    var nextIndex = index;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % buttons.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + buttons.length) % buttons.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    }

    buttons[nextIndex].focus();
    setType(buttons[nextIndex].dataset.type);
  }

  function toggleWifiPassword() {
    var security = $("#wifiSecurity").value;
    $("#wifiPasswordField").hidden = security === "nopass";
  }

  function scheduleRender() {
    syncRangeLabels();
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 70);
  }

  function syncRangeLabels() {
    var logoSize = clampNumber($("#logoSize").value, 8, maxLogoSize, defaultLogoSize);
    var logoPadding = clampNumber($("#logoPadding").value, 0, maxLogoPadding, defaultLogoPadding);
    var qrBoost = clampNumber($("#qrBoost").value, 0, 8, 0);
    $("#logoSize").value = logoSize;
    $("#logoPadding").value = logoPadding;
    $("#logoPaddingField").hidden = !logoDataUrl;
    $("#qrBoost").value = qrBoost;
    $("#quietZoneValue").textContent = $("#quietZone").value;
    $("#logoSizeValue").textContent = logoSize + "%";
    $("#logoPaddingValue").textContent = logoPadding + "%";
    $("#qrBoostValue").textContent = "+" + qrBoost;
    $("#borderWidthValue").textContent = $("#borderWidth").value + "px";
    $("#borderRadiusValue").textContent = $("#borderRadius").value + "px";
  }

  function readLogo(file) {
    if (!file) {
      return;
    }

    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
      showCopyState("Use PNG, JPG, SVG, or WebP");
      $("#logoUpload").value = "";
      return;
    }

    if (file.size > maxLogoBytes) {
      showCopyState("Logo max 2 MB");
      $("#logoUpload").value = "";
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      logoDataUrl = String(reader.result || "");
      $("#logoName").textContent = file.name;
      syncRangeLabels();
      render();
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    logoDataUrl = "";
    $("#logoUpload").value = "";
    $("#logoName").textContent = "Add logo";
    syncRangeLabels();
    render();
  }

  function applyPreset(name) {
    var preset = presets[name];
    if (!preset) {
      return;
    }

    Object.keys(preset).forEach(function (id) {
      var element = $("#" + id);
      if (!element) {
        return;
      }
      if (element.type === "checkbox") {
        element.checked = Boolean(preset[id]);
      } else {
        element.value = preset[id];
      }
    });

    render();
  }

  function resetAll() {
    $("#qrForm").reset();
    currentType = "url";
    logoDataUrl = "";
    $("#logoName").textContent = "Add logo";
    setDefaultEventTimes();
    setType("url");
    toggleWifiPassword();
    syncRangeLabels();
    render();
  }

  function render() {
    var payload;
    var options = getStyleOptions();

    try {
      payload = buildPayload(currentType);
      latestPayload = payload;
      latestFileBase = buildFileBase(currentType, payload);
      $("#payloadOutput").value = payload;

      if (!payload.trim()) {
        throw new Error("Enter content to generate a QR code.");
      }

      var qr = createQr(payload, options);

      var matrix = buildMatrix(qr);
      latestSvg = createQrSvg(matrix, options);
      $("#qrMount").innerHTML = latestSvg;
      $("#qrError").hidden = true;
      $("#qrMeta").textContent = matrix.length + " x " + matrix.length + " modules";
      renderQuality(payload, matrix.length, options);
    } catch (error) {
      latestSvg = "";
      $("#qrMount").innerHTML = "";
      $("#qrError").textContent = getErrorMessage(error);
      $("#qrError").hidden = false;
      $("#qrMeta").textContent = "Needs input";
      $("#qualityStrip").innerHTML = "";
    }
  }

  function getErrorMessage(error) {
    var message = error && error.message ? error.message : String(error || "");
    if (/overflow|too long|code length/i.test(message)) {
      return "This content is too long for a QR code. Shorten it or use a link.";
    }
    return message || "Unable to generate this QR code.";
  }

  function buildMatrix(qr) {
    var count = qr.getModuleCount();
    var matrix = [];
    for (var row = 0; row < count; row += 1) {
      var rowValues = [];
      for (var col = 0; col < count; col += 1) {
        rowValues.push(qr.isDark(row, col));
      }
      matrix.push(rowValues);
    }
    return matrix;
  }

  function getStyleOptions() {
    var errorCorrection = $("#errorCorrection").value;
    if (logoDataUrl && errorCorrection !== "H") {
      errorCorrection = "H";
      $("#errorCorrection").value = "H";
    }

    return {
      size: clampNumber($("#qrSize").value, 256, 2048, 1024),
      quietZone: clampNumber($("#quietZone").value, 1, 8, 4),
      errorCorrection: errorCorrection,
      dotStyle: $("#dotStyle").value,
      eyeStyle: $("#eyeStyle").value === "square" ? "square" : "rounded",
      foregroundColor: $("#foregroundColor").value,
      gradientColor: $("#gradientColor").value,
      backgroundColor: $("#backgroundColor").value,
      eyeColor: $("#eyeColor").value,
      borderColor: $("#borderColor").value,
      labelColor: $("#labelColor").value,
      useGradient: $("#useGradient").checked,
      transparentBg: $("#transparentBg").checked,
      logoSize: clampNumber($("#logoSize").value, 8, maxLogoSize, defaultLogoSize),
      logoPadding: clampNumber($("#logoPadding").value, 0, maxLogoPadding, defaultLogoPadding),
      qrBoost: clampNumber($("#qrBoost").value, 0, 8, 0),
      borderWidth: clampNumber($("#borderWidth").value, 0, 80, 18),
      borderRadius: clampNumber($("#borderRadius").value, 0, 96, 28),
      frameLabel: $("#frameLabel").value.trim()
    };
  }

  function buildPayload(type) {
    if (type === "url") {
      return normalizeUrl($("#urlValue").value);
    }

    if (type === "wifi") {
      var security = $("#wifiSecurity").value;
      var ssid = $("#wifiSsid").value.trim();
      var password = security === "nopass" ? "" : $("#wifiPassword").value;
      if (!ssid) {
        return "";
      }
      return "WIFI:T:" + security + ";S:" + escapeWifi(ssid) + ";P:" + escapeWifi(password) + ";H:" + ($("#wifiHidden").checked ? "true" : "false") + ";;";
    }

    if (type === "contact") {
      return buildVCard();
    }

    if (type === "email") {
      return buildMailto();
    }

    if (type === "phone") {
      var phone = sanitizePhone($("#phoneNumber").value);
      return phone ? "tel:" + phone : "";
    }

    if (type === "sms") {
      return buildSms();
    }

    if (type === "event") {
      return buildCalendar();
    }

    if (type === "location") {
      return buildGeo();
    }

    return $("#textValue").value;
  }

  function normalizeUrl(value) {
    var trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      trimmed = "https://" + trimmed;
    }
    return trimmed;
  }

  function escapeWifi(value) {
    return String(value).replace(/([\\;,":])/g, "\\$1");
  }

  function buildVCard() {
    var name = $("#contactName").value.trim();
    var org = $("#contactOrg").value.trim();
    var title = $("#contactTitle").value.trim();
    var phone = $("#contactPhone").value.trim();
    var email = $("#contactEmail").value.trim();
    var url = normalizeOptionalUrl($("#contactUrl").value);
    var address = $("#contactAddress").value.trim();
    var note = $("#contactNote").value.trim();

    if (!name && !org && !phone && !email && !url && !address) {
      return "";
    }

    var parts = splitName(name);
    var lines = [
      "BEGIN:VCARD",
      "VERSION:4.0",
      "FN:" + escapeVCard(name || org || email || phone),
      "N:" + escapeVCard(parts.last) + ";" + escapeVCard(parts.first) + ";;;"
    ];

    addLine(lines, "ORG", org, escapeVCard);
    addLine(lines, "TITLE", title, escapeVCard);
    addLine(lines, "TEL", phone, escapeVCard);
    addLine(lines, "EMAIL", email, escapeVCard);
    addLine(lines, "URL", url, escapeVCard);
    if (address) {
      lines.push("ADR:;;" + escapeVCard(address) + ";;;;");
    }
    addLine(lines, "NOTE", note, escapeVCard);
    lines.push("END:VCARD");
    return lines.join("\n");
  }

  function splitName(name) {
    var words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      return { first: words[0] || "", last: "" };
    }
    return {
      first: words.slice(0, -1).join(" "),
      last: words[words.length - 1]
    };
  }

  function addLine(lines, property, value, escaper) {
    if (value) {
      lines.push(property + ":" + escaper(value));
    }
  }

  function escapeVCard(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  function normalizeOptionalUrl(value) {
    return value.trim() ? normalizeUrl(value) : "";
  }

  function buildMailto() {
    var to = $("#emailTo").value.trim();
    var subject = $("#emailSubject").value.trim();
    var body = $("#emailBody").value;
    if (!to && !subject && !body) {
      return "";
    }

    var query = [];
    if (subject) {
      query.push("subject=" + encodeURIComponent(subject));
    }
    if (body) {
      query.push("body=" + encodeURIComponent(body));
    }
    return "mailto:" + encodeMailRecipients(to) + (query.length ? "?" + query.join("&") : "");
  }

  function encodeMailRecipients(value) {
    return value
      .split(",")
      .map(function (part) {
        return encodeURIComponent(part.trim());
      })
      .filter(Boolean)
      .join(",");
  }

  function sanitizePhone(value) {
    return value.trim().replace(/[^\d+*#(),.;-]/g, "");
  }

  function buildSms() {
    var phone = sanitizePhone($("#smsNumber").value);
    var message = $("#smsMessage").value;
    if (!phone && !message) {
      return "";
    }
    return "sms:" + phone + (message ? "?body=" + encodeURIComponent(message) : "");
  }

  function buildCalendar() {
    var title = $("#eventTitle").value.trim();
    var start = $("#eventStart").value;
    var end = $("#eventEnd").value;
    var location = $("#eventLocation").value.trim();
    var description = $("#eventDescription").value.trim();

    if (!title && !start && !end && !location && !description) {
      return "";
    }

    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//QR Freely//QR Event//EN",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "@qrfreely.com",
      "DTSTAMP:" + formatUtcIcsDate(new Date())
    ];

    if (start) {
      lines.push("DTSTART:" + formatLocalIcsDate(start));
    }
    if (end) {
      lines.push("DTEND:" + formatLocalIcsDate(end));
    }
    addLine(lines, "SUMMARY", title || "Event", escapeIcs);
    addLine(lines, "LOCATION", location, escapeIcs);
    addLine(lines, "DESCRIPTION", description, escapeIcs);
    lines.push("END:VEVENT", "END:VCALENDAR");
    return lines.join("\n");
  }

  function formatLocalIcsDate(value) {
    return value.replace(/[-:]/g, "").replace("T", "T") + (value.length === 16 ? "00" : "");
  }

  function formatUtcIcsDate(date) {
    return date.getUTCFullYear() + pad2(date.getUTCMonth() + 1) + pad2(date.getUTCDate()) + "T" + pad2(date.getUTCHours()) + pad2(date.getUTCMinutes()) + pad2(date.getUTCSeconds()) + "Z";
  }

  function escapeIcs(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  function buildGeo() {
    var lat = $("#locationLat").value.trim();
    var lng = $("#locationLng").value.trim();
    var label = $("#locationLabel").value.trim();
    if (!lat || !lng) {
      return "";
    }
    var latNumber = Number(lat);
    var lngNumber = Number(lng);
    if (Number.isNaN(latNumber) || Number.isNaN(lngNumber) || latNumber < -90 || latNumber > 90 || lngNumber < -180 || lngNumber > 180) {
      throw new Error("Latitude must be -90 to 90 and longitude must be -180 to 180.");
    }
    var base = "geo:" + trimCoordinate(latNumber) + "," + trimCoordinate(lngNumber);
    return label ? base + "?q=" + encodeURIComponent(trimCoordinate(latNumber) + "," + trimCoordinate(lngNumber) + "(" + label + ")") : base;
  }

  function trimCoordinate(number) {
    return String(Math.round(number * 1000000) / 1000000);
  }

  function createQr(payload, options) {
    var qr = makeQr(payload, 0, options.errorCorrection);
    var baseVersion = moduleCountToVersion(qr.getModuleCount());
    var logoBoost = logoDataUrl ? getLogoVersionBoost(options.logoSize) : 0;
    var requestedBoost = Math.max(options.qrBoost, logoBoost);

    options.baseVersion = baseVersion;
    options.versionBoostApplied = 0;

    if (requestedBoost <= 0) {
      return qr;
    }

    var targetVersion = Math.min(40, baseVersion + requestedBoost);
    if (targetVersion <= baseVersion) {
      return qr;
    }

    qr = makeQr(payload, targetVersion, options.errorCorrection);
    options.versionBoostApplied = moduleCountToVersion(qr.getModuleCount()) - baseVersion;
    return qr;
  }

  function makeQr(payload, typeNumber, errorCorrection) {
    var qr = qrcode(typeNumber, errorCorrection);
    qr.addData(payload, "Byte");
    qr.make();
    return qr;
  }

  function moduleCountToVersion(moduleCount) {
    return Math.max(1, Math.round((moduleCount - 17) / 4));
  }

  function getLogoVersionBoost(logoSize) {
    if (logoSize <= 10) {
      return 1;
    }
    if (logoSize <= 14) {
      return 2;
    }
    if (logoSize <= 18) {
      return 3;
    }
    if (logoSize <= 21) {
      return 4;
    }
    return 5;
  }

  function createQrSvg(matrix, options) {
    var count = matrix.length;
    var qrSize = options.size;
    var border = options.borderWidth;
    var labelHeight = options.frameLabel ? Math.max(72, Math.round(qrSize * 0.095)) : 0;
    var width = qrSize + border * 2;
    var height = qrSize + labelHeight + border * 2;
    var innerWidth = width - border * 2;
    var innerHeight = height - border * 2;
    var outerRadius = Math.min(options.borderRadius, width / 2, height / 2);
    var innerRadius = Math.max(0, outerRadius - border);
    var moduleTotal = count + options.quietZone * 2;
    var cell = qrSize / moduleTotal;
    var origin = border + options.quietZone * cell;
    var fill = options.useGradient ? "url(#qrGradient)" : options.foregroundColor;
    var bgFill = options.transparentBg ? "none" : options.backgroundColor;
    var logoZone = logoDataUrl ? getLogoZone(border, qrSize, options) : null;
    var id = "qrGradient";
    var svg = [];

    svg.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="Generated QR code">');
    svg.push("<defs>");
    if (options.useGradient) {
      svg.push('<linearGradient id="' + id + '" x1="0%" y1="0%" x2="100%" y2="100%">');
      svg.push('<stop offset="0%" stop-color="' + escapeAttr(options.foregroundColor) + '"/>');
      svg.push('<stop offset="100%" stop-color="' + escapeAttr(options.gradientColor) + '"/>');
      svg.push("</linearGradient>");
    }
    svg.push("</defs>");

    if (!options.transparentBg || options.frameLabel) {
      svg.push('<path d="' + roundedRectPath(0, 0, width, height, outerRadius) + '" fill="' + bgFill + '"/>');
    }

    if (options.borderWidth > 0) {
      svg.push('<path d="' + roundedRectPath(0, 0, width, height, outerRadius) + roundedRectPath(border, border, innerWidth, innerHeight, innerRadius) + '" fill="' + escapeAttr(options.borderColor) + '" fill-rule="evenodd"/>');
    }

    if (!options.transparentBg || options.frameLabel) {
      svg.push('<path d="' + roundedRectPath(border, border, innerWidth, innerHeight, innerRadius) + '" fill="' + bgFill + '"/>');
    }
    svg.push('<g fill="' + fill + '">');

    for (var row = 0; row < count; row += 1) {
      for (var col = 0; col < count; col += 1) {
        var moduleX = origin + col * cell;
        var moduleY = border + options.quietZone * cell + row * cell;
        if (!matrix[row][col] || isFinder(row, col, count) || moduleOverlapsLogo(moduleX, moduleY, cell, logoZone)) {
          continue;
        }
        svg.push(drawModule(moduleX, moduleY, cell, options.dotStyle));
      }
    }

    svg.push("</g>");
    drawFinderSvg(svg, origin, origin, cell, options);
    drawFinderSvg(svg, origin + (count - 7) * cell, origin, cell, options);
    drawFinderSvg(svg, origin, origin + (count - 7) * cell, cell, options);

    if (logoDataUrl) {
      drawLogoSvg(svg, logoZone, options);
    }

    if (options.frameLabel) {
      var labelMetrics = getFrameLabelMetrics(options.frameLabel, qrSize, width, border);
      var fitAttrs = labelMetrics.textLength ? ' textLength="' + labelMetrics.textLength + '" lengthAdjust="spacingAndGlyphs"' : "";
      svg.push('<text x="' + (width / 2) + '" y="' + (border + qrSize + labelHeight / 2 + 12) + '" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="' + labelMetrics.fontSize + '" font-weight="800" letter-spacing="0" fill="' + escapeAttr(options.labelColor) + '"' + fitAttrs + ">" + escapeText(options.frameLabel) + "</text>");
    }

    svg.push("</svg>");
    return svg.join("");
  }

  function roundedRectPath(x, y, width, height, radius) {
    var right = x + width;
    var bottom = y + height;
    var r = Math.max(0, Math.min(radius, width / 2, height / 2));

    if (r === 0) {
      return "M" + x + " " + y + "H" + right + "V" + bottom + "H" + x + "Z";
    }

    return [
      "M", x + r, y,
      "H", right - r,
      "Q", right, y, right, y + r,
      "V", bottom - r,
      "Q", right, bottom, right - r, bottom,
      "H", x + r,
      "Q", x, bottom, x, bottom - r,
      "V", y + r,
      "Q", x, y, x + r, y,
      "Z"
    ].join(" ");
  }

  function drawModule(x, y, cell, style) {
    var gap = style === "square" ? 0 : Math.max(0.45, cell * 0.1);
    var size = Math.max(0, cell - gap);
    var offset = gap / 2;

    if (style === "dot") {
      var radius = size / 2;
      return '<circle cx="' + (x + cell / 2) + '" cy="' + (y + cell / 2) + '" r="' + radius + '"/>';
    }

    if (style === "rounded") {
      return '<rect x="' + (x + offset) + '" y="' + (y + offset) + '" width="' + size + '" height="' + size + '" rx="' + (size * 0.32) + '"/>';
    }

    return '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '"/>';
  }

  function drawFinderSvg(svg, x, y, cell, options) {
    var outer = cell * 7;
    var middle = cell * 5;
    var inner = cell * 3;
    var radius = options.eyeStyle === "rounded" ? cell * 1.5 : 0;

    if (options.transparentBg) {
      svg.push('<path d="' + roundedRectPath(x, y, outer, outer, radius) + roundedRectPath(x + cell, y + cell, middle, middle, radius * 0.7) + '" fill="' + escapeAttr(options.eyeColor) + '" fill-rule="evenodd"/>');
    } else {
      svg.push('<rect x="' + x + '" y="' + y + '" width="' + outer + '" height="' + outer + '" rx="' + radius + '" fill="' + escapeAttr(options.eyeColor) + '"/>');
      svg.push('<rect x="' + (x + cell) + '" y="' + (y + cell) + '" width="' + middle + '" height="' + middle + '" rx="' + (radius * 0.7) + '" fill="' + escapeAttr(options.backgroundColor) + '"/>');
    }

    svg.push('<rect x="' + (x + cell * 2) + '" y="' + (y + cell * 2) + '" width="' + inner + '" height="' + inner + '" rx="' + (radius * 0.45) + '" fill="' + escapeAttr(options.eyeColor) + '"/>');
  }

  function getLogoZone(border, qrSize, options) {
    var logoSize = Math.round(qrSize * (options.logoSize / 100));
    var padding = Math.round(logoSize * (options.logoPadding / 100));
    var logoX = border + (qrSize - logoSize) / 2;
    var logoY = border + (qrSize - logoSize) / 2;
    var clearX = logoX - padding;
    var clearY = logoY - padding;
    var clearSize = logoSize + padding * 2;

    return {
      logoX: logoX,
      logoY: logoY,
      logoSize: logoSize,
      clearX: clearX,
      clearY: clearY,
      clearSize: clearSize,
      clearRadius: Math.max(8, clearSize * 0.14)
    };
  }

  function moduleOverlapsLogo(x, y, cell, logoZone) {
    if (!logoZone) {
      return false;
    }

    return x < logoZone.clearX + logoZone.clearSize &&
      x + cell > logoZone.clearX &&
      y < logoZone.clearY + logoZone.clearSize &&
      y + cell > logoZone.clearY;
  }

  function drawLogoSvg(svg, logoZone, options) {
    if (!options.transparentBg) {
      svg.push('<rect x="' + logoZone.clearX + '" y="' + logoZone.clearY + '" width="' + logoZone.clearSize + '" height="' + logoZone.clearSize + '" rx="' + logoZone.clearRadius + '" fill="' + escapeAttr(options.backgroundColor) + '"/>');
    }
    svg.push('<image href="' + escapeAttr(logoDataUrl) + '" x="' + logoZone.logoX + '" y="' + logoZone.logoY + '" width="' + logoZone.logoSize + '" height="' + logoZone.logoSize + '" preserveAspectRatio="xMidYMid meet"/>');
  }

  function isFinder(row, col, count) {
    return (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);
  }

  function getFrameLabelMetrics(label, qrSize, width, border) {
    var baseSize = Math.max(32, Math.round(qrSize * 0.045));
    var minSize = 14;
    var sidePadding = Math.max(18, border + 14);
    var maxWidth = Math.max(80, width - sidePadding * 2);
    var estimatedWidth = estimateTextWidth(label, baseSize);
    var fontSize = estimatedWidth > maxWidth ? Math.max(minSize, Math.floor(maxWidth / Math.max(1, label.length * 0.62))) : baseSize;
    var fittedWidth = estimateTextWidth(label, fontSize);

    return {
      fontSize: fontSize,
      textLength: fittedWidth > maxWidth ? Math.round(maxWidth) : 0
    };
  }

  function estimateTextWidth(text, fontSize) {
    return text.length * fontSize * 0.62;
  }

  function renderQuality(payload, moduleCount, options) {
    var backgroundForContrast = options.transparentBg ? "#ffffff" : options.backgroundColor;
    var dotContrast = contrastRatio(options.foregroundColor, backgroundForContrast);
    var gradientContrast = options.useGradient ? contrastRatio(options.gradientColor, backgroundForContrast) : dotContrast;
    var eyeContrast = contrastRatio(options.eyeColor, backgroundForContrast);
    var contrast = Math.min(dotContrast, gradientContrast, eyeContrast);
    var warnings = [];
    var ok = [];

    ok.push(moduleCount + " modules");
    ok.push("V" + moduleCountToVersion(moduleCount));
    ok.push(payload.length + " chars");
    ok.push("EC " + options.errorCorrection);
    if (options.versionBoostApplied > 0) {
      ok.push("Boost +" + options.versionBoostApplied);
    }

    if (contrast < 3.8) {
      warnings.push({ label: "Low contrast", level: "danger" });
    } else if (contrast < 5) {
      warnings.push({ label: "Moderate contrast", level: "warn" });
    }

    if (options.transparentBg) {
      warnings.push({ label: "Test final background", level: "warn" });
    }

    if (options.quietZone < 4) {
      warnings.push({ label: "Small quiet zone", level: options.quietZone <= 1 ? "danger" : "warn" });
    }

    if (logoDataUrl && options.errorCorrection !== "H") {
      warnings.push({ label: "Use high correction with logos", level: "warn" });
    }

    if (logoDataUrl && options.logoSize > 20) {
      warnings.push({ label: "Large logo", level: "warn" });
    }

    if (moduleCount > 89) {
      warnings.push({ label: "Dense code", level: "warn" });
    }

    $("#qualityStrip").innerHTML = ok.map(function (label) {
      return '<span class="quality-pill">' + escapeText(label) + "</span>";
    }).concat(warnings.map(function (warning) {
      return '<span class="quality-pill ' + warning.level + '">' + escapeText(warning.label) + "</span>";
    })).join("");
  }

  function contrastRatio(hexA, hexB) {
    var lumA = relativeLuminance(hexToRgb(hexA));
    var lumB = relativeLuminance(hexToRgb(hexB));
    var light = Math.max(lumA, lumB);
    var dark = Math.min(lumA, lumB);
    return (light + 0.05) / (dark + 0.05);
  }

  function hexToRgb(hex) {
    var value = hex.replace("#", "");
    if (value.length === 3) {
      value = value.split("").map(function (char) {
        return char + char;
      }).join("");
    }
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function relativeLuminance(rgb) {
    return [rgb.r, rgb.g, rgb.b].map(function (channel) {
      var value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }).reduce(function (sum, value, index) {
      return sum + value * [0.2126, 0.7152, 0.0722][index];
    }, 0);
  }

  function downloadSvg() {
    if (!latestSvg) {
      return;
    }
    downloadBlob(new Blob([latestSvg], { type: "image/svg+xml;charset=utf-8" }), latestFileBase + ".svg");
  }

  function downloadPng() {
    if (!latestSvg) {
      return;
    }

    var options = getStyleOptions();
    var scale = Math.max(1, Math.min(3, Math.ceil(1536 / options.size)));
    var svgBlob = new Blob([latestSvg], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(svgBlob);
    var image = new Image();
    image.onload = function () {
      var viewBox = parseViewBox(latestSvg);
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(viewBox.width * scale);
      canvas.height = Math.round(viewBox.height * scale);
      var context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) {
        if (blob) {
          downloadBlob(blob, latestFileBase + ".png");
        }
      }, "image/png");
    };
    image.onerror = function () {
      URL.revokeObjectURL(url);
      showCopyState("PNG export failed");
    };
    image.src = url;
  }

  function parseViewBox(svg) {
    var match = svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
    return {
      width: match ? Number(match[1]) : 1024,
      height: match ? Number(match[2]) : 1024
    };
  }

  function downloadBlob(blob, filename) {
    var anchor = document.createElement("a");
    var url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 500);
  }

  function copyPayload() {
    if (!latestPayload) {
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(latestPayload).then(function () {
        showCopyState("Copied");
      }).catch(copyPayloadFallback);
      return;
    }

    copyPayloadFallback();
  }

  function copyPayloadFallback() {
    var output = $("#payloadOutput");
    output.focus();
    output.select();
    document.execCommand("copy");
    showCopyState("Copied");
  }

  function showCopyState(text) {
    var button = $("#copyPayload");
    var oldText = button.lastChild.nodeValue;
    button.lastChild.nodeValue = " " + text;
    window.setTimeout(function () {
      button.lastChild.nodeValue = oldText;
    }, 1400);
  }

  function setDefaultEventTimes() {
    var start = new Date();
    start.setDate(start.getDate() + 7);
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    var end = new Date(start.getTime() + 60 * 60 * 1000);
    $("#eventStart").value = toDatetimeLocal(start);
    $("#eventEnd").value = toDatetimeLocal(end);
  }

  function toDatetimeLocal(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate()) + "T" + pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  }

  function buildFileBase(type, payload) {
    var stamp = new Date().toISOString().slice(0, 10);
    var hint = payload.replace(/^[a-z][a-z0-9+.-]*:/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 36).toLowerCase();
    return "qrfreely-" + type + (hint ? "-" + hint : "") + "-" + stamp;
  }

  function clampNumber(value, min, max, fallback) {
    var number = Number(value);
    if (Number.isNaN(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, number));
  }

  function pad2(number) {
    return String(number).padStart(2, "0");
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
})();
