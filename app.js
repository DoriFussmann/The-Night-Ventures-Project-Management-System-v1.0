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

  function renderAdminTasks() { var tTodo = document.getElementById('adminTasksTodo'); var tDoing = document.getElementById('adminTasksDoing'); var tDone = document.getElementById('adminTasksDone'); if (!tTodo || !tDoing || !tDone) return; tTodo.innerHTML = ''; tDoing.innerHTML = ''; tDone.innerHTML = ''; var map = readProjects(); var rowMeta = []; Object.keys(map).forEach(function(id) { var p = map[id]; function pushRows(list, tbody, stage) { (list || []).forEach(function(task) { var tr = document.createElement('tr'); tr.className = 'table-row'; var deadline = ''; var st = p.structuredTasks || {}; var stageLists = [st.todo || [], st.doing || [], st.done || []]; for (var i = 0; i < stageLists.length; i++) { var arr = stageLists[i]; for (var j = 0; j < arr.length; j++) { var e = arr[j]; var display = e.title || e.short || ''; if (display === task) { deadline = e.deadline || ''; break; } } } tr.innerHTML = '<td>' + escapeHtml(p.name || '') + '</td>' + '<td>' + escapeHtml(task) + '</td>' + '<td>' + escapeHtml(deadline) + '</td>'; tbody.appendChild(tr); rowMeta.push({ tbodyId: tbody.id, projectId: id, task: task, stage: stage }); }); } var tasks = p.tasks || {}; pushRows(tasks.todo, tTodo, 'todo'); pushRows(tasks.doing, tDoing, 'doing'); pushRows(tasks.done, tDone, 'done'); }); function wire(tableBody, tbodyId) { var rows = tableBody.querySelectorAll('tr.table-row'); var i = 0; rows.forEach(function(row){ row.addEventListener('click', function(){ while (i < rowMeta.length && rowMeta[i].tbodyId !== tbodyId) { i++; } var meta = rowMeta[i++]; if (!meta) return; var taskModal = document.getElementById('taskModal'); if (!taskModal) return; // Pre-fill task modal
      var pickerRow = select('taskProjectPickerRow'); if (pickerRow) pickerRow.style.display = 'block';
      var picker = select('taskProjectPicker'); if (picker) { picker.innerHTML = ''; var map = readProjects(); Object.keys(map).forEach(function(pid){ var opt = document.createElement('option'); opt.value = pid; opt.textContent = map[pid].name || pid; picker.appendChild(opt); }); picker.value = meta.projectId; }
      taskModal.__getSelectedProjectId = function(){ return (picker && picker.value) || meta.projectId; };
      var taskTitle = document.getElementById('taskTitle'); if (taskTitle) taskTitle.value = meta.task;
      var taskStage = document.getElementById('taskStage'); if (taskStage) taskStage.value = meta.stage;
      var st = (readProjects()[meta.projectId] || {}).structuredTasks || {}; var detail = null; ['todo','doing','done'].forEach(function(s){ (st[s]||[]).forEach(function(e){ var d = e.title || e.short || ''; if (d === meta.task) detail = e; }); }); var taskShort = document.getElementById('taskShort'); var taskLong = document.getElementById('taskLong'); var taskDeadline = document.getElementById('taskDeadline'); if (taskShort) taskShort.value = (detail && detail.short) || ''; if (taskLong) taskLong.value = (detail && detail.long) || ''; if (taskDeadline) taskDeadline.value = (detail && detail.deadline) || '';
      if (typeof taskModal.openFromGlobal === 'function') { taskModal.openFromGlobal(); }
    }); }); }
    wire(tTodo, 'adminTasksTodo'); wire(tDoing, 'adminTasksDoing'); wire(tDone, 'adminTasksDone'); }

  function renderHomeGrid() { var grid = document.getElementById('projectsGrid'); if (!grid) return; var map = readProjects(); var ids = Object.keys(map); grid.innerHTML = ''; ids.forEach(function(id) { var p = map[id]; var card = document.createElement('div'); card.className = 'project-card'; var hasLogo = p.imageDataUrl && typeof p.imageDataUrl === 'string' && p.imageDataUrl.length > 0; card.innerHTML = ((hasLogo ? '<img class="project-logo" src="' + p.imageDataUrl + '" alt="' + escapeHtml((p.name||'') + ' logo') + '">' : '<div class="project-logo" aria-hidden="true"></div>') + '<div class="project-name">' + escapeHtml(p.name || '') + '</div>' + '<div class="project-desc">' + escapeHtml(p.type || '') + '</div>'); card.addEventListener('click', function() { var modal = document.getElementById('addProjectModal'); if (modal && typeof modal.populateForEdit === 'function') { modal.populateForEdit(id, p); } }); grid.appendChild(card); }); }

  function renderHomeTasks() { var colTodo = document.getElementById('tasksColTodo'); var colDoing = document.getElementById('tasksColDoing'); var colDone = document.getElementById('tasksColDone'); if (!colTodo || !colDoing || !colDone) return; colTodo.innerHTML = ''; colDoing.innerHTML = ''; colDone.innerHTML = ''; colTodo.dataset.stage = 'todo'; colDoing.dataset.stage = 'doing'; colDone.dataset.stage = 'done'; var map = readProjects(); Object.keys(map).forEach(function(id) { var p = map[id]; function addButtons(tasks, container) { (tasks || []).forEach(function(task) { var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'task-button'; btn.draggable = true; btn.dataset.projectId = id; btn.dataset.stage = container.dataset.stage; btn.dataset.task = task; btn.textContent = (p.name || 'Untitled') + ' | ' + task; btn.addEventListener('dragstart', onDragStart); btn.addEventListener('dragend', function(){ btn.classList.remove('dragging'); }); container.appendChild(btn); }); } addButtons((p.tasks || {}).todo, colTodo); addButtons((p.tasks || {}).doing, colDoing); addButtons((p.tasks || {}).done, colDone); });
    // Setup drop zones on both inner and outer containers for robustness
    function wireZone(inner, stage) { var outer = inner && inner.parentElement; function addHandlers(targetEl) { if (!targetEl) return; targetEl.addEventListener('dragover', function(e){ e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch(_) {} if (outer && outer.classList) outer.classList.add('drag-over'); }); targetEl.addEventListener('dragleave', function(){ if (outer && outer.classList) outer.classList.remove('drag-over'); }); targetEl.addEventListener('drop', function(e){ e.preventDefault(); if (outer && outer.classList) outer.classList.remove('drag-over'); onDropTask(stage, e); }); }
      addHandlers(inner); addHandlers(outer); }
    wireZone(colTodo, 'todo'); wireZone(colDoing, 'doing'); wireZone(colDone, 'done');
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

  // Users storage
  var USERS_KEY = 'tnv_users_v1';
  function readUsers() { try { var raw = localStorage.getItem(USERS_KEY); return raw ? JSON.parse(raw) : []; } catch (_) { return []; } }
  function writeUsers(list) { localStorage.setItem(USERS_KEY, JSON.stringify(list)); }

  function setupUserModal() {
    var addUserBtn = document.getElementById('addUserBtn');
    var modal = document.getElementById('userModal');
    var closeBtn = document.getElementById('closeUserModalBtn');
    var cancelBtn = document.getElementById('cancelUserBtn');
    var saveBtn = document.getElementById('saveUserBtn');
    var deleteBtn = document.getElementById('deleteUserBtn');
    var projectSel = document.getElementById('userProject');
    var firstNameEl = document.getElementById('userFirstName');
    var lastNameEl = document.getElementById('userLastName');
    var emailEl = document.getElementById('userEmail');
    var passEl = document.getElementById('userPassword');
    var permsTbody = document.getElementById('userPermsTbody');
    if (!modal || !projectSel) return;

    function populateProjects() {
      var map = readProjects(); var ids = Object.keys(map);
      projectSel.innerHTML = '';
      ids.forEach(function(id){ var opt = document.createElement('option'); opt.value = id; opt.textContent = map[id].name || id; projectSel.appendChild(opt); });
    }
    var ALL_PAGES = [
      { id: 'home', label: 'Home' },
      { id: 'admin', label: 'Admin' },
      { id: 'bva', label: 'BvA' },
      { id: 'probability', label: 'Probability Map' }
    ];
    function renderPermissions(perms) {
      if (!permsTbody) return;
      // SuperAdmin checkbox default unchecked
      var superAdminEl = document.getElementById('userSuperAdmin');
      if (superAdminEl) {
        var isSuper = !!(perms && perms.__superAdmin === true);
        superAdminEl.checked = isSuper;
        superAdminEl.onchange = function(){
          // When SuperAdmin is checked, check all; when unchecked, leave as-is
          if (!permsTbody) return;
          var inputs = permsTbody.querySelectorAll('input[type="checkbox"][data-perm-id]');
          inputs.forEach(function(cb){ cb.checked = superAdminEl.checked ? true : cb.checked; });
        };
      }
      permsTbody.innerHTML = '';
      ALL_PAGES.forEach(function(pg){
        var tr = document.createElement('tr');
        var checked = true;
        if (perms && typeof perms === 'object' && pg.id in perms) checked = !!perms[pg.id];
        tr.innerHTML = '<td>' + escapeHtml(pg.label) + '</td>' +
                       '<td><input type="checkbox" data-perm-id="' + pg.id + '" ' + (checked ? 'checked' : '') + ' /></td>';
        permsTbody.appendChild(tr);
      });
    }
    function open() {
      populateProjects();
      renderPermissions();
      modal.setAttribute('aria-hidden','false');
      var focusables = modal.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
      var first = focusables[0]; var last = focusables[focusables.length - 1];
      trapFocus(modal, first, last);
      setTimeout(function(){ projectSel.focus(); }, 0);
      document.addEventListener('keydown', onEscape);
    }
    function close() {
      modal.setAttribute('aria-hidden','true');
      releaseFocus(modal);
      document.removeEventListener('keydown', onEscape);
      if (addUserBtn) { try { addUserBtn.focus(); } catch(_){} }
    }
    function onEscape(e) { if (e.key === 'Escape') close(); }
    function clearForm() {
      firstNameEl && (firstNameEl.value = '');
      lastNameEl && (lastNameEl.value = '');
      emailEl && (emailEl.value = '');
      passEl && (passEl.value = '');
      renderPermissions();
    }

    if (addUserBtn) { addUserBtn.addEventListener('click', function(){ clearForm(); open(); }); }
    if (closeBtn) closeBtn.addEventListener('click', function(){ close(); });
    if (cancelBtn) cancelBtn.addEventListener('click', function(){ close(); });
    modal.addEventListener('click', function(e){ if (e.target === modal) close(); });

    if (saveBtn) {
      attachProgressCycle(saveBtn);
      saveBtn.addEventListener('click', function(){
        var users = readUsers();
        if (modal.__editingId) {
          var idx = users.findIndex(function(u){ return u.id === modal.__editingId; });
          if (idx !== -1) {
            users[idx] = Object.assign({}, users[idx], {
              projectId: projectSel.value || null,
              email: (emailEl && emailEl.value) || '',
              password: (passEl && passEl.value) || '',
              firstName: (firstNameEl && firstNameEl.value) || '',
              lastName: (lastNameEl && lastNameEl.value) || '',
              permissions: collectPermissions()
            });
          }
        } else {
          var record = {
            id: 'u_' + Math.random().toString(36).slice(2,10),
            projectId: projectSel.value || null,
            email: (emailEl && emailEl.value) || '',
            password: (passEl && passEl.value) || '',
            firstName: (firstNameEl && firstNameEl.value) || '',
            lastName: (lastNameEl && lastNameEl.value) || '',
            permissions: collectPermissions()
          };
          users.push(record);
        }
        writeUsers(users);
        renderAdminUsers();
        setTimeout(function(){ clearForm(); close(); modal.__editingId = null; }, 1000);
      });
    }

    if (deleteBtn) {
      attachProgressCycle(deleteBtn);
      deleteBtn.addEventListener('click', function(){
        if (!modal.__editingId) return;
        var users = readUsers();
        var idx = users.findIndex(function(u){ return u.id === modal.__editingId; });
        if (idx !== -1) users.splice(idx, 1);
        writeUsers(users);
        renderAdminUsers();
        setTimeout(function(){ clearForm(); close(); modal.__editingId = null; }, 700);
      });
    }

    modal.populateForEdit = function(user){
      populateProjects();
      modal.__editingId = user.id;
      projectSel.value = user.projectId || '';
      if (firstNameEl) firstNameEl.value = user.firstName || '';
      if (lastNameEl) lastNameEl.value = user.lastName || '';
      if (emailEl) emailEl.value = user.email || '';
      if (passEl) passEl.value = user.password || '';
      renderPermissions(user.permissions || {});
      open();
    };

      function collectPermissions() {
      var result = {};
      if (!permsTbody) return result;
      var inputs = permsTbody.querySelectorAll('input[type="checkbox"][data-perm-id]');
      inputs.forEach(function(cb){ result[cb.getAttribute('data-perm-id')] = cb.checked; });
        var superAdminEl = document.getElementById('userSuperAdmin');
        if (superAdminEl && superAdminEl.checked) {
          result.__superAdmin = true;
          // Ensure all are true when superadmin
          Object.keys(result).forEach(function(k){ if (k !== '__superAdmin') result[k] = true; });
        } else {
          result.__superAdmin = false;
        }
      return result;
    }
  }

  // Ensure we don't reopen project modal unless it was opened from project modal
  ;(function(){
    var originalSetupTaskModal = setupTaskModal;
    setupTaskModal = function(openTaskBtn, projectModal){
      originalSetupTaskModal(openTaskBtn, projectModal);
      var taskModal = document.getElementById('taskModal'); if (!taskModal) return;
      var openBtn = openTaskBtn;
      if (openBtn) {
        openBtn.addEventListener('click', function(){ taskModal.__restoreProjectModal = true; });
      }
      var closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
      function safeClosePatch(){ var modal = document.getElementById('taskModal'); if (!modal) return; var projModal = projectModal; if (projModal && projModal.setAttribute && !modal.__restoreProjectModal) { projModal.setAttribute('aria-hidden','true'); } modal.__restoreProjectModal = false; }
      if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', safeClosePatch);
      var cancelTaskBtn = document.getElementById('cancelTaskBtn'); if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', safeClosePatch);
      var saveTaskBtn = document.getElementById('saveTaskBtn'); if (saveTaskBtn) saveTaskBtn.addEventListener('click', safeClosePatch);
      var deleteTaskBtn = document.getElementById('deleteTaskBtn'); if (deleteTaskBtn) deleteTaskBtn.addEventListener('click', safeClosePatch);
    };
  })();
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
      setupUserModal();
      renderProjects();
      renderAdminTasks();
      renderAdminUsers();
      renderHomeGrid();
      renderHomeTasks();
      wireAuthBox();
      wireHomeAddProject();
    }).catch(function(){
      setupAddProjectModal();
      setupUserModal();
      renderProjects();
      renderAdminTasks();
      renderAdminUsers();
      renderHomeGrid();
      renderHomeTasks();
      wireAuthBox();
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

  function renderAdminUsers() {
    var tbody = document.getElementById('adminUsersTbody'); if (!tbody) return;
    var users = readUsers(); var map = readProjects();
    tbody.innerHTML = '';
    users.forEach(function(u, idx){
      var tr = document.createElement('tr'); tr.className = 'table-row';
      var projName = (u.projectId && map[u.projectId] && map[u.projectId].name) ? map[u.projectId].name : '';
      tr.innerHTML = '<td>' + escapeHtml(projName) + '</td>' +
                     '<td>' + escapeHtml(u.firstName || '') + '</td>' +
                     '<td>' + escapeHtml(u.lastName || '') + '</td>' +
                     '<td>' + escapeHtml(u.email || '') + '</td>';
      tbody.appendChild(tr);
    });
    Array.prototype.forEach.call(tbody.querySelectorAll('tr.table-row'), function(row, i){
      row.addEventListener('click', function(){
        var users = readUsers(); var user = users[i]; if (!user) return;
        var modal = document.getElementById('userModal'); if (modal && typeof modal.populateForEdit === 'function') { modal.populateForEdit(user); }
      });
    });
  }

  // Simple auth box toggle logic (client-side only)
  function wireAuthBox() {
    var loginTab = document.getElementById('authTabLogin');
    var signupTab = document.getElementById('authTabSignup');
    var loginForm = document.getElementById('authLoginForm');
    var signupForm = document.getElementById('authSignupForm');
    var signupProject = document.getElementById('authSignupProject');
    if (!loginTab || !signupTab || !loginForm || !signupForm) return;
    function setMode(mode) {
      var isLogin = mode === 'login';
      loginForm.style.display = isLogin ? '' : 'none';
      signupForm.style.display = isLogin ? 'none' : '';
      loginTab.setAttribute('aria-pressed', isLogin ? 'true' : 'false');
      signupTab.setAttribute('aria-pressed', isLogin ? 'false' : 'true');
    }
    function populateSignupProjects() {
      if (!signupProject) return;
      var map = readProjects(); var ids = Object.keys(map);
      signupProject.innerHTML = '';
      ids.forEach(function(id){ var opt = document.createElement('option'); opt.value = id; opt.textContent = map[id].name || id; signupProject.appendChild(opt); });
    }
    loginTab.addEventListener('click', function(){ setMode('login'); });
    signupTab.addEventListener('click', function(){ populateSignupProjects(); setMode('signup'); });
    // Prevent default submits for now
    loginForm.addEventListener('submit', function(e){ e.preventDefault(); });
    signupForm.addEventListener('submit', function(e){ e.preventDefault(); });
  }
})();

