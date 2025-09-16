(function() {
  function attachProgressCycle(button, options) {
    var workingMs = (options && options.workingMs) || 1000;
    var doneMs = (options && options.doneMs) || 700;
    if (button.__hasCycle) return;
    button.__hasCycle = true;
    button.addEventListener('click', function(ev) {
      if (!button.classList.contains('btn-progress')) return; // opt-in only
      if (button.disabled) return;
      button.disabled = true;
      button.classList.remove('is-done');
      button.classList.add('is-working');
      button.setAttribute('aria-busy', 'true');
      setTimeout(function() {
        button.classList.remove('is-working');
        button.classList.add('is-done');
        setTimeout(function() {
          button.disabled = false;
          button.classList.remove('is-done');
          button.removeAttribute('aria-busy');
        }, doneMs);
      }, workingMs);
    });
  }

  function select(id) { return document.getElementById(id); }

  // --- API client ---
  var API_BASE = window.API_BASE || 'http://localhost:5174';
  function apiGetProjects() { return fetch(API_BASE + '/api/projects').then(function(r){ return r.json(); }); }
  function apiCreateProject(id, project) { return fetch(API_BASE + '/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id || undefined, project: project }) }).then(function(r){ return r.json(); }); }
  function apiUpdateProject(id, project) { return fetch(API_BASE + '/api/projects/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: project }) }).then(function(r){ return r.json(); }); }
  function apiDeleteProject(id) { return fetch(API_BASE + '/api/projects/' + encodeURIComponent(id), { method: 'DELETE' }).then(function(r){ return r.json(); }); }

  function setupAdminTransparency() {
    var preflight = select('preflight');
    var runBtn = select('runBtn');
    var debugLog = select('debugLog');
    var copyBtn = select('copyDebugBtn');
    var resetBtn = select('resetBtn');
    var liveRegion = select('liveRegion');
    if (!preflight || !runBtn || !debugLog || !copyBtn || !resetBtn) return;
    attachProgressCycle(runBtn); attachProgressCycle(copyBtn); attachProgressCycle(resetBtn);
    function setDebug(text) { debugLog.textContent = text; }
    function announce(msg) { if (!liveRegion) return; liveRegion.textContent = ''; setTimeout(function() { liveRegion.textContent = msg; }, 50); }
    function safeParse(json) { try { return { ok: true, value: JSON.parse(json) }; } catch (e) { return { ok: false, error: String(e) }; } }
    runBtn.addEventListener('click', function() {
      var input = preflight.value.trim(); var parsed = safeParse(input); var now = new Date().toISOString(); var output;
      if (parsed.ok) { output = { timestamp: now, status: 'ok', echo: parsed.value, notes: 'Processed successfully.' }; }
      else { output = { timestamp: now, status: 'error', error: parsed.error }; }
      setTimeout(function() { setDebug(JSON.stringify(output, null, 2)); announce('Postflight debug updated.'); }, 1000);
    });
    copyBtn.addEventListener('click', function() {
      var text = debugLog.textContent || ''; var toCopy = text.length ? text : 'No debug information.';
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(toCopy).then(function() { announce('Debug log copied to clipboard.'); }).catch(function() { announce('Copy failed.'); }); }
      else { var ta = document.createElement('textarea'); ta.value = toCopy; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); announce('Debug log copied to clipboard.'); } catch (_) { announce('Copy failed.'); } document.body.removeChild(ta); }
    });
    resetBtn.addEventListener('click', function() { preflight.value = defaultPreflightJson(); setDebug(''); announce('Preflight and debug reset.'); });
  }

  function trapFocus(container, firstFocusable, lastFocusable) {
    function handle(e) { if (e.key !== 'Tab') return; if (e.shiftKey && document.activeElement === firstFocusable) { e.preventDefault(); lastFocusable.focus(); } else if (!e.shiftKey && document.activeElement === lastFocusable) { e.preventDefault(); firstFocusable.focus(); } }
    container.__focusHandler = handle; container.addEventListener('keydown', handle);
  }
  function releaseFocus(container) { if (container && container.__focusHandler) { container.removeEventListener('keydown', container.__focusHandler); delete container.__focusHandler; } }
  function formatCurrency(valueNumber) { if (isNaN(valueNumber) || valueNumber === null) return ''; var n = Number(valueNumber); return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function parseCurrency(text) { if (!text) return null; var cleaned = String(text).replace(/[^0-9.\-]/g, ''); if (cleaned === '' || cleaned === '.' || cleaned === '-') return null; var num = Number(cleaned); return isNaN(num) ? null : num; }

  function setupAddProjectModal() {
    var openBtn = document.getElementById('addProjectBtn');
    var modal = document.getElementById('addProjectModal');
    var backdrop = document.getElementById('modalBackdrop');
    var closeBtn = document.getElementById('closeModalBtn');
    var cancelBtn = document.getElementById('cancelAddProject');
    var saveBtn = document.getElementById('saveAddProject');
    var deleteBtn = document.getElementById('deleteProject');
    var openTaskBtn = document.getElementById('openTaskModalBtn');
    var nameEl = document.getElementById('projName');
    var descEl = document.getElementById('projDesc');
    var peopleEl = document.getElementById('projPeople');
    var sourceEl = document.getElementById('projSource');
    var typeEl = document.getElementById('projType');
    var statusEl = document.getElementById('projStatus');
    var monthlyImpactEl = document.getElementById('projMonthlyImpact');
    var hoursPerMonthEl = document.getElementById('projHoursPerMonth');
    var imageEl = document.getElementById('projImage');
    var previewEl = document.getElementById('projImagePreview');
    var projectsTbody = document.getElementById('projectsTbody');

    if (!modal || !backdrop) return;

    function open() {
      backdrop.setAttribute('aria-hidden', 'false'); modal.setAttribute('aria-hidden', 'false');
      var focusables = modal.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
      var first = focusables[0]; var last = focusables[focusables.length - 1];
      trapFocus(modal, first, last); setTimeout(function() { if (nameEl) nameEl.focus(); }, 0); document.addEventListener('keydown', onEscape);
    }
    function close() {
      backdrop.setAttribute('aria-hidden', 'true'); modal.setAttribute('aria-hidden', 'true'); releaseFocus(modal); document.removeEventListener('keydown', onEscape); if (openBtn) { try { openBtn.focus(); } catch (_) {} }
    }
    function onEscape(e) { if (e.key === 'Escape') close(); }

    if (openBtn) { openBtn.addEventListener('click', function() { modal.__editingId = null; clearForm(); open(); }); }
    closeBtn && closeBtn.addEventListener('click', function() { close(); });
    cancelBtn && cancelBtn.addEventListener('click', function() { close(); });
    backdrop.addEventListener('click', function() { close(); });

    if (monthlyImpactEl) {
      monthlyImpactEl.addEventListener('focus', function() { var n = parseCurrency(monthlyImpactEl.value); if (n !== null) monthlyImpactEl.value = String(n); });
      monthlyImpactEl.addEventListener('blur', function() { var n = parseCurrency(monthlyImpactEl.value); monthlyImpactEl.value = n === null ? '' : formatCurrency(n); });
    }

    if (imageEl && previewEl) {
      imageEl.addEventListener('change', function() { var file = imageEl.files && imageEl.files[0]; if (!file) { previewEl.removeAttribute('src'); return; } var reader = new FileReader(); reader.onload = function(ev) { previewEl.src = ev.target && ev.target.result || ''; }; reader.readAsDataURL(file); });
    }

    if (saveBtn) {
      attachProgressCycle(saveBtn);
      saveBtn.addEventListener('click', function() {
        var people = (peopleEl.value || '').split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
        function persistWithImage(imageDataUrl) {
          var impactNumber = monthlyImpactEl ? parseCurrency(monthlyImpactEl.value) : null;
          var hoursNumber = hoursPerMonthEl && hoursPerMonthEl.value !== '' ? Number(hoursPerMonthEl.value) : null;
          var payload = {
            name: nameEl.value || '', description: descEl.value || '', individuals: people,
            source: (sourceEl && sourceEl.value) || '', type: (typeEl && typeEl.value) || '', status: (statusEl && statusEl.value) || 'Live',
            monthlyImpact: impactNumber, hoursPerMonth: hoursNumber,
            tasks: { todo: [], doing: [], done: [] }, imageDataUrl: imageDataUrl || null
          };
          setTimeout(function() { if (modal.__editingId) { updateProject(modal.__editingId, payload); } else { createProject(payload); }
            renderProjects(); renderAdminTasks(); renderHomeGrid(); renderHomeTasks(); clearForm(); close(); modal.__editingId = null; }, 1000);
        }
        if (previewEl && previewEl.src) { persistWithImage(previewEl.src); }
        else if (imageEl && imageEl.files && imageEl.files[0]) { var reader = new FileReader(); reader.onload = function(ev) { persistWithImage((ev.target && ev.target.result) || null); }; reader.readAsDataURL(imageEl.files[0]); }
        else { persistWithImage(null); }
      });
    }

    if (deleteBtn) {
      attachProgressCycle(deleteBtn);
      deleteBtn.addEventListener('click', function() { if (!modal.__editingId) return; var map = readProjects(); var name = map[modal.__editingId] && map[modal.__editingId].name ? map[modal.__editingId].name : 'this project'; var ok = confirm('Delete ' + name + '?'); if (!ok) return; setTimeout(function() { deleteProject(modal.__editingId); renderProjects(); renderAdminTasks(); renderHomeGrid(); renderHomeTasks(); clearForm(); close(); modal.__editingId = null; }, 1000); });
    }

    setupTaskModal(openTaskBtn, modal);

    var addTaskGlobalBtn = document.getElementById('addTaskGlobalBtn');
    if (addTaskGlobalBtn) {
      addTaskGlobalBtn.addEventListener('click', function() {
        var pickerRow = select('taskProjectPickerRow'); var picker = select('taskProjectPicker'); if (!pickerRow || !picker) return;
        var map = readProjects(); var ids = Object.keys(map); picker.innerHTML = ''; ids.forEach(function(id) { var opt = document.createElement('option'); opt.value = id; opt.textContent = map[id].name || id; picker.appendChild(opt); });
        pickerRow.style.display = 'block'; var taskModal = select('taskModal'); if (taskModal) { taskModal.__getSelectedProjectId = function() { return picker.value; }; if (typeof taskModal.openFromGlobal === 'function') { taskModal.openFromGlobal(); return; } }
        modal.setAttribute('aria-hidden','true'); var openTaskBtn = select('openTaskModalBtn'); if (openTaskBtn) openTaskBtn.click();
      });
    }

    function clearForm() {
      nameEl.value = ''; descEl.value = ''; peopleEl.value = ''; if (sourceEl) sourceEl.value = 'EarlyStageLabs'; if (typeEl) typeEl.value = 'Fractional CFO'; if (statusEl) statusEl.value = 'Live'; if (monthlyImpactEl) monthlyImpactEl.value = ''; if (hoursPerMonthEl) hoursPerMonthEl.value = ''; if (previewEl) previewEl.removeAttribute('src'); if (imageEl) imageEl.value = '';
    }

    modal.populateForEdit = function(id, project) {
      modal.__editingId = id; nameEl.value = project.name || ''; descEl.value = project.description || ''; peopleEl.value = (project.individuals || []).join(', ');
      if (sourceEl) sourceEl.value = project.source || 'EarlyStageLabs'; if (typeEl) typeEl.value = project.type || 'Fractional CFO'; if (statusEl) statusEl.value = project.status || 'Live';
      if (monthlyImpactEl) monthlyImpactEl.value = project.monthlyImpact != null ? formatCurrency(project.monthlyImpact) : ''; if (hoursPerMonthEl) hoursPerMonthEl.value = project.hoursPerMonth != null ? String(project.hoursPerMonth) : '';
      if (previewEl) { if (project.imageDataUrl) previewEl.src = project.imageDataUrl; else previewEl.removeAttribute('src'); }
      open();
    };
  }

  var PROJECTS_KEY = 'tnv_projects_v1'; function readProjects() { try { var raw = localStorage.getItem(PROJECTS_KEY); return raw ? JSON.parse(raw) : {}; } catch (_) { return {}; } }
  function writeProjects(map) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(map)); }
  function generateId() { return 'p_' + Math.random().toString(36).slice(2, 10); }
  function createProject(project) { var map = readProjects(); var id = generateId(); map[id] = project; writeProjects(map); apiCreateProject(id, project).catch(function(){}); return id; }
  function updateProject(id, project) { var map = readProjects(); if (map[id]) { map[id] = project; writeProjects(map); } apiUpdateProject(id, project).catch(function(){}); }
  function deleteProject(id) { var map = readProjects(); if (map[id]) { delete map[id]; writeProjects(map); } apiDeleteProject(id).catch(function(){}); }
  function mergeServerIntoLocal(serverMap) { var local = readProjects(); var merged = Object.assign({}, local, serverMap || {}); writeProjects(merged); }

  function renderProjects() { var tbody = document.getElementById('projectsTbody'); if (!tbody) return; var map = readProjects(); var ids = Object.keys(map); tbody.innerHTML = ''; ids.forEach(function(id) { var p = map[id]; var tr = document.createElement('tr'); tr.className = 'table-row'; var impact = p.monthlyImpact != null ? formatCurrency(p.monthlyImpact) : ''; tr.innerHTML = '<td>' + escapeHtml(p.name || '') + '</td>' + '<td>' + escapeHtml(p.type || '') + '</td>' + '<td>' + escapeHtml(p.status || '') + '</td>' + '<td>' + escapeHtml(impact) + '</td>'; tbody.appendChild(tr); }); tbody.querySelectorAll('tr.table-row').forEach(function(row, index) { row.addEventListener('click', function() { var id = ids[index]; var map = readProjects(); var modal = document.getElementById('addProjectModal'); if (modal && map[id] && typeof modal.populateForEdit === 'function') { modal.populateForEdit(id, map[id]); } }); }); }

  function renderAdminTasks() { var tTodo = document.getElementById('adminTasksTodo'); var tDoing = document.getElementById('adminTasksDoing'); var tDone = document.getElementById('adminTasksDone'); if (!tTodo || !tDoing || !tDone) return; tTodo.innerHTML = ''; tDoing.innerHTML = ''; tDone.innerHTML = ''; var map = readProjects(); Object.keys(map).forEach(function(id) { var p = map[id]; function pushRows(list, tbody) { (list || []).forEach(function(task) { var tr = document.createElement('tr'); var deadline = ''; var st = p.structuredTasks || {}; var stageLists = [st.todo || [], st.doing || [], st.done || []]; for (var i = 0; i < stageLists.length; i++) { var arr = stageLists[i]; for (var j = 0; j < arr.length; j++) { var e = arr[j]; var display = e.title || e.short || ''; if (display === task) { deadline = e.deadline || ''; break; } } } tr.innerHTML = '<td>' + escapeHtml(p.name || '') + '</td>' + '<td>' + escapeHtml(task) + '</td>' + '<td>' + escapeHtml(deadline) + '</td>'; tbody.appendChild(tr); }); } var tasks = p.tasks || {}; pushRows(tasks.todo, tTodo); pushRows(tasks.doing, tDoing); pushRows(tasks.done, tDone); }); }

  function renderHomeGrid() { var grid = document.getElementById('projectsGrid'); if (!grid) return; var map = readProjects(); var ids = Object.keys(map); grid.innerHTML = ''; ids.forEach(function(id) { var p = map[id]; var card = document.createElement('div'); card.className = 'project-card'; var hasLogo = p.imageDataUrl && typeof p.imageDataUrl === 'string' && p.imageDataUrl.length > 0; card.innerHTML = ((hasLogo ? '<img class="project-logo" src="' + p.imageDataUrl + '" alt="' + escapeHtml((p.name||'') + ' logo') + '">' : '<div class="project-logo" aria-hidden="true"></div>') + '<div class="project-name">' + escapeHtml(p.name || '') + '</div>' + '<div class="project-desc">' + escapeHtml(p.type || '') + '</div>'); card.addEventListener('click', function() { var modal = document.getElementById('addProjectModal'); if (modal && typeof modal.populateForEdit === 'function') { modal.populateForEdit(id, p); } }); grid.appendChild(card); }); }

  function renderHomeTasks() { var colTodo = document.getElementById('tasksColTodo'); var colDoing = document.getElementById('tasksColDoing'); var colDone = document.getElementById('tasksColDone'); if (!colTodo || !colDoing || !colDone) return; colTodo.innerHTML = ''; colDoing.innerHTML = ''; colDone.innerHTML = ''; colTodo.dataset.stage = 'todo'; colDoing.dataset.stage = 'doing'; colDone.dataset.stage = 'done'; var map = readProjects(); Object.keys(map).forEach(function(id) { var p = map[id]; function addButtons(tasks, container) { (tasks || []).forEach(function(task) { var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'task-button'; btn.draggable = true; btn.dataset.projectId = id; btn.dataset.stage = container.dataset.stage; btn.dataset.task = task; btn.textContent = (p.name || 'Untitled') + ' | ' + task; btn.addEventListener('dragstart', onDragStart); btn.addEventListener('dragend', function(){ btn.classList.remove('dragging'); }); container.appendChild(btn); }); } addButtons((p.tasks || {}).todo, colTodo); addButtons((p.tasks || {}).doing, colDoing); addButtons((p.tasks || {}).done, colDone); });
    // Setup drop zones
    [colTodo, colDoing, colDone].forEach(function(col) { col.addEventListener('dragover', function(e){ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('drag-over'); }); col.addEventListener('dragleave', function(){ col.classList.remove('drag-over'); }); col.addEventListener('drop', function(e){ e.preventDefault(); col.classList.remove('drag-over'); var stage = col.dataset.stage; onDropTask(stage, e); }); });
  }

  function onDragStart(e) { var t = e.target; try { e.dataTransfer.setData('text/plain', JSON.stringify({ projectId: t.dataset.projectId, stage: t.dataset.stage, task: t.dataset.task })); } catch(_) {} e.dataTransfer.effectAllowed = 'move'; t.classList.add('dragging'); }

  function onDropTask(targetStage, e) {
    var data; try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(_) { return; }
    var map = readProjects(); var proj = map[data.projectId]; if (!proj) return;
    // Remove from current arrays
    ['todo','doing','done'].forEach(function(s){ var arr = (proj.tasks && proj.tasks[s]) || []; var idx = arr.indexOf(data.task); if (idx !== -1) arr.splice(idx,1); if (proj.tasks) proj.tasks[s] = arr; });
    // Move structured if exists
    if (!proj.structuredTasks) proj.structuredTasks = { todo: [], doing: [], done: [] };
    ['todo','doing','done'].forEach(function(s){ var arr = proj.structuredTasks[s] || []; var found = arr.findIndex(function(entry){ var display = entry.title || entry.short || ''; return display === data.task; }); if (found !== -1) { var entry = arr.splice(found,1)[0]; (proj.structuredTasks[targetStage] = proj.structuredTasks[targetStage] || []).push(entry); }
    });
    // Add to target
    (proj.tasks[targetStage] = proj.tasks[targetStage] || []).push(data.task);
    writeProjects(map); apiUpdateProject(data.projectId, proj).catch(function(){});
    renderHomeTasks();
  }

  function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#039;'); }
  function defaultPreflightJson() { return JSON.stringify({ action: 'example', params: { id: 123, verbose: false } }, null, 2); }

  function setupTaskModal(openTaskBtn, projectModal) { var taskModal = document.getElementById('taskModal'); var taskTitle = document.getElementById('taskTitle'); var taskStage = document.getElementById('taskStage'); var taskShort = document.getElementById('taskShort'); var taskLong = document.getElementById('taskLong'); var taskDeadline = document.getElementById('taskDeadline'); var closeTaskModalBtn = document.getElementById('closeTaskModalBtn'); var cancelTaskBtn = document.getElementById('cancelTaskBtn'); var saveTaskBtn = document.getElementById('saveTaskBtn'); if (!taskModal) return; function clearTaskForm() { if (taskTitle) taskTitle.value = ''; if (taskStage) taskStage.value = 'todo'; if (taskShort) taskShort.value = ''; if (taskLong) taskLong.value = ''; if (taskDeadline) taskDeadline.value = ''; } function openTaskModal() { taskModal.setAttribute('aria-hidden', 'false'); var focusables = taskModal.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'); var first = focusables[0]; var last = focusables[focusables.length - 1]; trapFocus(taskModal, first, last); setTimeout(function() { if (taskTitle) taskTitle.focus(); }, 0); document.addEventListener('keydown', onEscape); } function closeTaskModal() { taskModal.setAttribute('aria-hidden', 'true'); releaseFocus(taskModal); document.removeEventListener('keydown', onEscape); if (projectModal && projectModal.setAttribute) { projectModal.setAttribute('aria-hidden', 'false'); } } function onEscape(e) { if (e.key === 'Escape') closeTaskModal(); } taskModal.openFromGlobal = function() { if (projectModal && projectModal.setAttribute) { projectModal.setAttribute('aria-hidden','true'); } var pickerRow = select('taskProjectPickerRow'); if (pickerRow) pickerRow.style.display = 'block'; clearTaskForm(); openTaskModal(); }; if (openTaskBtn) { openTaskBtn.addEventListener('click', function() { if (projectModal && projectModal.setAttribute) { projectModal.setAttribute('aria-hidden','true'); } var pickerRow = select('taskProjectPickerRow'); if (pickerRow) pickerRow.style.display = 'none'; if (taskModal) taskModal.__getSelectedProjectId = null; clearTaskForm(); openTaskModal(); }); } closeTaskModalBtn && closeTaskModalBtn.addEventListener('click', function() { closeTaskModal(); }); cancelTaskBtn && cancelTaskBtn.addEventListener('click', function() { closeTaskModal(); }); if (saveTaskBtn) { attachProgressCycle(saveTaskBtn); saveTaskBtn.addEventListener('click', function() { var targetProjectId = (taskModal && typeof taskModal.__getSelectedProjectId === 'function') ? taskModal.__getSelectedProjectId() : (projectModal && projectModal.__editingId); if (!targetProjectId) { targetProjectId = ensureProjectExistsFromForm(); if (projectModal) projectModal.__editingId = targetProjectId; } var map = readProjects(); var proj = map[targetProjectId] || {}; if (!proj.tasks) proj.tasks = { todo: [], doing: [], done: [] }; var entry = { title: taskTitle.value || '', short: taskShort.value || '', long: taskLong.value || '', deadline: taskDeadline.value || '' }; var stage = (taskStage && taskStage.value) || 'todo'; var display = entry.title || entry.short || '[Untitled Task]'; if (!proj.structuredTasks) proj.structuredTasks = { todo: [], doing: [], done: [] }; proj.structuredTasks[stage].push(entry); (proj.tasks[stage] = proj.tasks[stage] || []).push(display); map[targetProjectId] = proj; writeProjects(map); apiUpdateProject(targetProjectId, proj).catch(function(){}); renderProjects(); renderAdminTasks(); renderHomeGrid(); renderHomeTasks(); closeTaskModal(); if (taskModal) taskModal.__getSelectedProjectId = null; }); } function ensureProjectExistsFromForm() { var people = (select('projPeople').value || '').split(',').map(function(s){return s.trim();}).filter(Boolean); var payload = { name: select('projName').value || '', description: select('projDesc').value || '', individuals: people, source: (select('projSource') && select('projSource').value) || '', type: (select('projType') && select('projType').value) || '', status: (select('projStatus') && select('projStatus').value) || 'Live', monthlyImpact: parseCurrency(select('projMonthlyImpact') && select('projMonthlyImpact').value), hoursPerMonth: (select('projHoursPerMonth') && select('projHoursPerMonth').value) ? Number(select('projHoursPerMonth').value) : null, tasks: { todo: [], doing: [], done: [] }, structuredTasks: { todo: [], doing: [], done: [] }, imageDataUrl: (select('projImagePreview') && select('projImagePreview').src) || null }; var id = createProject(payload); return id; }
  }

  document.addEventListener('DOMContentLoaded', function() {
    var preflightEl = document.getElementById('preflight');
    if (preflightEl && !preflightEl.value.trim()) { preflightEl.value = defaultPreflightJson(); }
    document.querySelectorAll('.btn-progress').forEach(function(btn) { attachProgressCycle(btn); });
    setupAdminTransparency();

    // Initial sync from server to local, then render
    apiGetProjects().then(function(serverMap){
      mergeServerIntoLocal(serverMap);
      setupAddProjectModal();
      renderProjects();
      renderAdminTasks();
      renderHomeGrid();
      renderHomeTasks();
      wireHomeAddProject();
    }).catch(function(){
      setupAddProjectModal();
      renderProjects();
      renderAdminTasks();
      renderHomeGrid();
      renderHomeTasks();
      wireHomeAddProject();
    });
  });

  function wireHomeAddProject() {
    var btn = document.getElementById('homeAddProjectBtn');
    if (!btn) return;
    attachProgressCycle(btn);
    btn.addEventListener('click', function() {
      var modal = document.getElementById('addProjectModal');
      if (!modal) return;
      // Clear and open in create mode
      if (typeof modal.populateForEdit === 'function') {
        // populateForEdit expects an existing project; instead emulate clear
        modal.__editingId = null;
      }
      // Manually clear fields
      var fields = ['projName','projDesc','projPeople','projSource','projType','projStatus','projMonthlyImpact','projHoursPerMonth'];
      fields.forEach(function(id){ var el = document.getElementById(id); if (!el) return; if (el.tagName === 'SELECT') { /* leave default */ } else { el.value = ''; } });
      var preview = document.getElementById('projImagePreview'); if (preview) preview.removeAttribute('src');
      var sourceEl = document.getElementById('projSource'); if (sourceEl) sourceEl.value = 'EarlyStageLabs';
      var typeEl = document.getElementById('projType'); if (typeEl) typeEl.value = 'Fractional CFO';
      var statusEl = document.getElementById('projStatus'); if (statusEl) statusEl.value = 'Live';
      var backdrop = document.getElementById('modalBackdrop');
      if (backdrop) backdrop.setAttribute('aria-hidden','false');
      modal.setAttribute('aria-hidden','false');
      // Focus first field
      var nameEl = document.getElementById('projName'); if (nameEl) setTimeout(function(){ nameEl.focus(); }, 0);
    });
  }
})();

