const STORAGE_KEY = "workPayTrackerEntriesV1";
    const SETTINGS_KEY = "workPayTrackerSettingsV1";

    let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"wage":"","filingStatus":"single","step2":"no","qualifyingChildren":0,"otherDependents":1,"otherIncome":0,"deductionsAmount":0,"extraWithholding":0,"stateWithholding":0}');
    let editingId = null;

    const els = {
      wage: document.getElementById("wage"),
      filingStatus: document.getElementById("filingStatus"),
      step2: document.getElementById("step2"),
      qualifyingChildren: document.getElementById("qualifyingChildren"),
      otherDependents: document.getElementById("otherDependents"),
      otherIncome: document.getElementById("otherIncome"),
      deductionsAmount: document.getElementById("deductionsAmount"),
      extraWithholding: document.getElementById("extraWithholding"),
      stateWithholding: document.getElementById("stateWithholding"),
      saveSettings: document.getElementById("saveSettings"),
      workDate: document.getElementById("workDate"),
      clockIn: document.getElementById("clockIn"),
      clockOut: document.getElementById("clockOut"),
      breakMinutes: document.getElementById("breakMinutes"),
      notes: document.getElementById("notes"),
      addEntry: document.getElementById("addEntry"),
      entriesList: document.getElementById("entriesList"),
      totalHours: document.getElementById("totalHours"),
      grossPay: document.getElementById("grossPay"),
      federalTax: document.getElementById("federalTax"),
      socialSecurity: document.getElementById("socialSecurity"),
      medicare: document.getElementById("medicare"),
      stateTax: document.getElementById("stateTax"),
      deductions: document.getElementById("deductions"),
      takeHomePay: document.getElementById("takeHomePay"),
      periodLabel: document.getElementById("periodLabel"),
      historyList: document.getElementById("historyList"),
      togglePayTax: document.getElementById("togglePayTax"),
      payTaxContent: document.getElementById("payTaxContent")
    };

    function todayISO() {
      const now = new Date();
      const offset = now.getTimezoneOffset();
      return new Date(now.getTime() - offset * 60000).toISOString().slice(0,10);
    }

    els.workDate.value = todayISO();
    els.wage.value = settings.wage ?? "";
    els.filingStatus.value = settings.filingStatus ?? "single";
    els.step2.value = settings.step2 ?? "no";
    els.qualifyingChildren.value = settings.qualifyingChildren ?? 0;
    els.otherDependents.value = settings.otherDependents ?? 0;
    els.otherIncome.value = settings.otherIncome ?? 0;
    els.deductionsAmount.value = settings.deductionsAmount ?? 0;
    els.extraWithholding.value = settings.extraWithholding ?? 0;
    els.stateWithholding.value = settings.stateWithholding ?? 0;
    updateRequiredFieldColors();

    function updateRequiredFieldColors() {
      document.querySelectorAll(".required-field").forEach(field => {
        let filled = false;

        if (field.tagName === "SELECT") {
          filled = field.value !== "";
        } else if (field.type === "number") {
          if (field.id === "wage") {
            filled = field.value !== "" && Number(field.value) > 0;
          } else {
            filled = field.value !== "" && !Number.isNaN(Number(field.value));
          }
        } else {
          filled = field.value.trim() !== "";
        }

        field.classList.toggle("is-empty", !filled);
        field.classList.toggle("is-filled", filled);
      });
    }

    document.querySelectorAll(".required-field").forEach(field => {
      field.addEventListener("input", updateRequiredFieldColors);
      field.addEventListener("change", updateRequiredFieldColors);
    });

    function money(n) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(n || 0);
    }

    function parseTimeToMinutes(value) {
      const [h, m] = value.split(":").map(Number);
      return h * 60 + m;
    }

    function calculateHours(clockIn, clockOut, breakMinutes) {
      let start = parseTimeToMinutes(clockIn);
      let end = parseTimeToMinutes(clockOut);

      if (end < start) end += 24 * 60;

      const workedMinutes = Math.max(0, end - start - Number(breakMinutes || 0));
      return workedMinutes / 60;
    }

    function annualFederalTax(adjustedAnnualWage, filingStatus, step2Checked) {
      const normal = {
        single: [
          { min: 0, max: 7500, base: 0, rate: 0.00 },
          { min: 7500, max: 19900, base: 0, rate: 0.10 },
          { min: 19900, max: 57900, base: 1240, rate: 0.12 },
          { min: 57900, max: 113200, base: 5800, rate: 0.22 },
          { min: 113200, max: 209275, base: 17966, rate: 0.24 },
          { min: 209275, max: 263725, base: 41024, rate: 0.32 },
          { min: 263725, max: 648100, base: 58448, rate: 0.35 },
          { min: 648100, max: Infinity, base: 192979.25, rate: 0.37 }
        ],
        married: [
          { min: 0, max: 16100, base: 0, rate: 0.00 },
          { min: 16100, max: 40900, base: 0, rate: 0.10 },
          { min: 40900, max: 116900, base: 2480, rate: 0.12 },
          { min: 116900, max: 227500, base: 11600, rate: 0.22 },
          { min: 227500, max: 419650, base: 35932, rate: 0.24 },
          { min: 419650, max: 528550, base: 82048, rate: 0.32 },
          { min: 528550, max: 777300, base: 116896, rate: 0.35 },
          { min: 777300, max: Infinity, base: 203958.50, rate: 0.37 }
        ],
        head: [
          { min: 0, max: 12000, base: 0, rate: 0.00 },
          { min: 12000, max: 29700, base: 0, rate: 0.10 },
          { min: 29700, max: 67700, base: 1770, rate: 0.12 },
          { min: 67700, max: 122950, base: 6330, rate: 0.22 },
          { min: 122950, max: 219025, base: 18485, rate: 0.24 },
          { min: 219025, max: 273475, base: 41543, rate: 0.32 },
          { min: 273475, max: 657850, base: 58967, rate: 0.35 },
          { min: 657850, max: Infinity, base: 193498.25, rate: 0.37 }
        ]
      };

      const status = normal[filingStatus] ? filingStatus : "single";
      const wage = Math.max(0, adjustedAnnualWage);

      function computeFromTable(testWage) {
        const table = normal[status];
        const bracket = table.find(b => testWage >= b.min && testWage < b.max) || table[table.length - 1];
        return bracket.base + (testWage - bracket.min) * bracket.rate;
      }

      return step2Checked ? computeFromTable(wage * 2) / 2 : computeFromTable(wage);
    }

    function calculatePayrollTaxes(gross) {
      const payPeriods = 52;
      const annualizedWage = gross * payPeriods;

      const otherIncome = Number(settings.otherIncome || 0);
      const deductionsAmount = Number(settings.deductionsAmount || 0);
      const adjustedAnnualWage = Math.max(0, annualizedWage + otherIncome - deductionsAmount);

      const annualDependentCredit =
        Number(settings.qualifyingChildren || 0) * 2200 +
        Number(settings.otherDependents || 0) * 500;

      const tentativeAnnualFederal = annualFederalTax(
        adjustedAnnualWage,
        settings.filingStatus || "single",
        (settings.step2 || "no") === "yes"
      );

      const federalBeforeExtra = Math.max(
        0,
        (tentativeAnnualFederal - annualDependentCredit) / payPeriods
      );

      const federal = federalBeforeExtra + Number(settings.extraWithholding || 0);
      const socialSecurity = gross * 0.062;
      const medicare = gross * 0.0145;
      const state = Number(settings.stateWithholding || 0);

      return {
        federal,
        socialSecurity,
        medicare,
        state,
        total: federal + socialSecurity + medicare + state
      };
    }

    function getPayPeriod(dateString) {
      const d = new Date(dateString + "T12:00:00");
      const day = d.getDay();

      const daysSinceTuesday = (day - 2 + 7) % 7;
      const start = new Date(d);
      start.setDate(d.getDate() - daysSinceTuesday);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const iso = date => {
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60000).toISOString().slice(0,10);
      };

      return { start: iso(start), end: iso(end) };
    }

    function formatDate(dateString) {
      return new Date(dateString + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
    }

    function saveAll() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    els.saveSettings.addEventListener("click", () => {
      settings.wage = Number(els.wage.value || 0);
      settings.filingStatus = els.filingStatus.value;
      settings.step2 = els.step2.value;
      settings.qualifyingChildren = Number(els.qualifyingChildren.value || 0);
      settings.otherDependents = Number(els.otherDependents.value || 0);
      settings.otherIncome = Number(els.otherIncome.value || 0);
      settings.deductionsAmount = Number(els.deductionsAmount.value || 0);
      settings.extraWithholding = Number(els.extraWithholding.value || 0);
      settings.stateWithholding = Number(els.stateWithholding.value || 0);
      saveAll();
      render();
      renderHistory();
      els.saveSettings.textContent = "Saved ✓";
      setTimeout(() => els.saveSettings.textContent = "Save Pay & Tax Settings", 1100);
    });

    els.addEntry.addEventListener("click", () => {
      const date = els.workDate.value;
      const clockIn = els.clockIn.value;
      const clockOut = els.clockOut.value;
      const breakMinutes = Number(els.breakMinutes.value || 0);
      const notes = els.notes.value.trim();

      if (!date || !clockIn || !clockOut) {
        alert("Please enter the date, clock-in time, and clock-out time.");
        return;
      }

      const hours = calculateHours(clockIn, clockOut, breakMinutes);

      const duplicateDateIndex = entries.findIndex(
        e => e.date === date && e.id !== editingId
      );

      if (duplicateDateIndex >= 0) {
        alert("A work entry already exists for that date. Use Edit on the saved entry instead.");
        return;
      }

      const entry = {
        id: editingId || crypto.randomUUID(),
        date,
        clockIn,
        clockOut,
        breakMinutes,
        notes,
        hours
      };

      if (editingId) {
        const editIndex = entries.findIndex(e => e.id === editingId);
        if (editIndex >= 0) entries[editIndex] = entry;
      } else {
        entries.push(entry);
      }

      entries.sort((a,b) => a.date.localeCompare(b.date));
      saveAll();

      editingId = null;
      els.addEntry.textContent = "Save Work Day";
      els.clockIn.value = "";
      els.clockOut.value = "";
      els.breakMinutes.value = 0;
      els.notes.value = "";
      updateRequiredFieldColors();

      render();
      renderHistory();
    });

    function editEntry(id) {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;

      editingId = id;
      els.workDate.value = entry.date;
      els.clockIn.value = entry.clockIn;
      els.clockOut.value = entry.clockOut;
      els.breakMinutes.value = entry.breakMinutes || 0;
      els.notes.value = entry.notes || "";
      els.addEntry.textContent = "Update Work Day";
      updateRequiredFieldColors();

      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function deleteEntry(id) {
      if (editingId === id) {
        editingId = null;
        els.addEntry.textContent = "Save Work Day";
      }
      entries = entries.filter(e => e.id !== id);
      saveAll();
      render();
      renderHistory();
    }

    function render() {
      const wage = Number(settings.wage || 0);

      const currentPeriod = getPayPeriod(els.workDate.value || todayISO());

      const periodEntries = entries.filter(e =>
        e.date >= currentPeriod.start && e.date <= currentPeriod.end
      );

      const totalHours = periodEntries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
      const gross = totalHours * wage;
      const taxes = calculatePayrollTaxes(gross);
      const takeHome = Math.max(0, gross - taxes.total);

      els.totalHours.textContent = totalHours.toFixed(2);
      els.grossPay.textContent = money(gross);
      els.federalTax.textContent = money(taxes.federal);
      els.socialSecurity.textContent = money(taxes.socialSecurity);
      els.medicare.textContent = money(taxes.medicare);
      els.stateTax.textContent = money(taxes.state);
      els.deductions.textContent = money(taxes.total);
      els.takeHomePay.textContent = money(takeHome);
      els.periodLabel.textContent =
        `${formatDate(currentPeriod.start)} – ${formatDate(currentPeriod.end)} • Paid Friday`;

      if (!entries.length) {
        els.entriesList.innerHTML = `<div class="empty">No work days saved yet.</div>`;
        return;
      }

      els.entriesList.innerHTML = entries.map(e => {
        const grossDay = Number(e.hours || 0) * wage;
        const currentPeriodForEntry = getPayPeriod(e.date);
        const weekEntries = entries.filter(x =>
          x.date >= currentPeriodForEntry.start && x.date <= currentPeriodForEntry.end
        );
        const weekGross = weekEntries.reduce((sum, x) => sum + Number(x.hours || 0), 0) * wage;
        const weekTaxes = calculatePayrollTaxes(weekGross);
        const effectiveTakeHomeRate = weekGross > 0 ? Math.max(0, (weekGross - weekTaxes.total) / weekGross) : 0;
        const takeHomeDay = grossDay * effectiveTakeHomeRate;
        const breakText = e.breakMinutes ? `${e.breakMinutes} min break` : "No unpaid break";

        return `
          <div class="entry">
            <div>
              <div class="entry-title">${formatDate(e.date)}</div>
              <div class="entry-meta">
                ${e.clockIn} – ${e.clockOut} • ${breakText}<br>
                ${Number(e.hours).toFixed(2)} hours
                ${e.notes ? ` • ${escapeHtml(e.notes)}` : ""}
              </div>
              <div class="entry-actions">
                <button class="edit" onclick="editEntry('${e.id}')">Edit</button>
                <button class="delete" onclick="deleteEntry('${e.id}')">Delete</button>
              </div>
            </div>
            <div class="entry-pay">
              ${money(takeHomeDay)}
              <div class="entry-meta">est. take-home</div>
            </div>
          </div>
        `;
      }).join("");
    }

    function escapeHtml(str) {
      return str.replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[ch]));
    }

    const PAY_TAX_COLLAPSE_KEY = "workPayTrackerPayTaxCollapsedV1";

    function setPayTaxCollapsed(collapsed) {
      els.payTaxContent.classList.toggle("hidden", collapsed);
      els.togglePayTax.classList.toggle("collapsed", collapsed);
      els.togglePayTax.setAttribute("aria-expanded", String(!collapsed));
      localStorage.setItem(PAY_TAX_COLLAPSE_KEY, collapsed ? "1" : "0");
    }

    const savedPayTaxCollapsed =
      localStorage.getItem(PAY_TAX_COLLAPSE_KEY) === "1";

    setPayTaxCollapsed(savedPayTaxCollapsed);

    els.togglePayTax.addEventListener("click", () => {
      const currentlyHidden = els.payTaxContent.classList.contains("hidden");
      setPayTaxCollapsed(!currentlyHidden);
    });

    document.querySelectorAll(".tab-btn").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
        button.classList.add("active");
        document.getElementById(button.dataset.tab).classList.add("active");
        if (button.dataset.tab === "historyPanel") renderHistory();
      });
    });

    function renderHistory() {
      const wage = Number(settings.wage || 0);
      if (!entries.length) {
        els.historyList.innerHTML = `<div class="empty">No previous pay periods yet.</div>`;
        return;
      }

      const today = todayISO();
      const current = getPayPeriod(today);
      const groups = {};

      entries.forEach(entry => {
        const period = getPayPeriod(entry.date);
        const key = `${period.start}|${period.end}`;
        if (!groups[key]) groups[key] = { period, entries: [] };
        groups[key].entries.push(entry);
      });

      const periods = Object.values(groups)
        .filter(group => group.period.end < current.start)
        .sort((a, b) => b.period.start.localeCompare(a.period.start));

      if (!periods.length) {
        els.historyList.innerHTML = `<div class="empty">Previous pay periods will appear here automatically after the current period ends.</div>`;
        return;
      }

      els.historyList.innerHTML = periods.map(group => {
        const hours = group.entries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
        const gross = hours * wage;
        const taxes = calculatePayrollTaxes(gross);
        const takeHome = Math.max(0, gross - taxes.total);

        const days = [...group.entries]
          .sort((a,b) => a.date.localeCompare(b.date))
          .map(e => `${formatDate(e.date)} — ${Number(e.hours).toFixed(2)} hrs`)
          .join("<br>");

        return `
          <div class="history-card">
            <div class="history-head">
              <div>
                <div class="history-title">${formatDate(group.period.start)} – ${formatDate(group.period.end)}</div>
                <div class="history-subtitle">Friday paycheck estimate</div>
              </div>
              <div class="history-pay">${money(takeHome)}</div>
            </div>

            <div class="history-stats">
              <div class="history-stat"><span>Hours</span><strong>${hours.toFixed(2)}</strong></div>
              <div class="history-stat"><span>Gross</span><strong>${money(gross)}</strong></div>
              <div class="history-stat"><span>Federal</span><strong>${money(taxes.federal)}</strong></div>
              <div class="history-stat"><span>FICA</span><strong>${money(taxes.socialSecurity + taxes.medicare)}</strong></div>
            </div>

            <div class="history-days">${days}</div>
          </div>
        `;
      }).join("");
    }

    render();
    renderHistory();