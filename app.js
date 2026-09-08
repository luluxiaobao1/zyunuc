/* ==========================================================
   app.js — 访问控制原型交互
   两个视图：结算单元列表、资源组管理列表。
   纯前端假数据：搜索过滤、分页、每页条数、跳页。
   ========================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ==========================================================
     数据：结算单元
     ========================================================== */
  // 标签库：个数少（≤10）且可持续管理（新增/编辑/移除）；
  // 一个结算单元只挂 1 个标签，一个标签可关联多个结算单元。
  // 结算单元标签库（构造数据保留这几个标签值）
  var UNIT_TAGS = [
    '集团外', '集团内非中台', '中台内', '中台内非智汇云', '智汇云'
  ];
  var unitTagSeq = UNIT_TAGS.length + 1;
  var unitTags = UNIT_TAGS.map(function (name, i) { return { id: i + 1, name: name }; });

  function findUnitTag(tagId) {
    for (var i = 0; i < unitTags.length; i++) {
      if (unitTags[i].id === tagId) return unitTags[i];
    }
    return null;
  }
  function unitTagName(tagId) {
    var t = findUnitTag(tagId);
    return t ? t.name : null;
  }
  // 标签名 → 标签 id；不存在则自动创建（用于初始推断）
  function unitTagIdOf(name) {
    for (var i = 0; i < unitTags.length; i++) {
      if (unitTags[i].name === name) return unitTags[i].id;
    }
    var id = unitTagSeq++;
    unitTags.push({ id: id, name: name });
    return id;
  }
  // 统计某个标签关联的结算单元数
  function unitTagCount(tagId) {
    var n = 0;
    UNITS.forEach(function (u) { if (u.tagId === tagId) n++; });
    return n;
  }

  // 依据结算单元名称/组织架构推断归属标签，取不到再按序轮转兜底
  function unitTagOf(name, org, i) {
    if (name.indexOf('智汇云') > -1 || org.indexOf('智汇云') > -1) return '智汇云';
    if (org.indexOf('技术中台') > -1) return '中台内非智汇云';
    if (org.indexOf('互联网') > -1 || org.indexOf('数字安全') > -1 || org.indexOf('职能平台') > -1) {
      return '集团内非中台';
    }
    return UNIT_TAGS[i % UNIT_TAGS.length];
  }

  var SEED = [
    ['互联网-商业化中心-商业产品事业部-拓展', '互联网/商业化中心/商业产品事业部', '于成龙(yuchenglong-sal)、李冬(lidong-sal)', 0],
    ['智汇云-基础架构部-中间件', '技术中台/智汇云产品部/基础架构部', '文启源(wenqiyuan)、王颖异(wangyingyi)', 20],
    ['智汇云-系统部-大数据', '技术中台/智汇云产品部/系统部', '王锋(wangfeng3)、孙伟(sunwei6)', 6],
    ['智汇云-云平台部-裸金属', '技术中台/智汇云产品部/云平台部', '魏冬(weidong)、刘捷(liujie3)', 2],
    ['数字安全-赋能支持中心', '数字安全/赋能支持中心/业务赋能与解决方案部', '周猛(zhoumeng1)、赵宇(zhaoyu6)', 1],
    ['数字安全-城市三部-华东金融部', '数字安全/城市三部/城市三部-华东金融部', '陈明(chenming3)、刘凤瑞(liufengrui)', 1],
    ['数字安全-AI咨询与战略落地中心-AI-FDE组', '数字安全/AI咨询与战略落地中心/AI咨询与战略落地中心-AI-FDE组', '李博(libo9)、杨波(yangbo7)', 1],
    ['职能平台-战略和投资中心-投资管理部', '职能平台/战略和投资中心/战略和投资中心', '洪兆(hongzhao)、向其奇(xiangqiqi1)', 1],
    ['智汇云-云服务运维部', '技术中台/智汇云产品部/云服务运维部', '魏冬(weidong)、刘捷(liujie3)', 1],
    ['职能平台-运营管理中心-集中采购部', '职能平台/运营管理中心/集中采购部', '张雪(zhangxue5)、管智鹏(guanzhipeng)', 1]
  ];

  var BU = [
    { name: '互联网', root: '互联网', mid: ['商业化中心', '搜索事业部', '浏览器事业部', '智能硬件事业部'] },
    { name: '数字安全', root: '数字安全', mid: ['城市一部', '城市二部', '城市三部', '赋能支持中心', 'AI咨询与战略落地中心'] },
    { name: '技术中台', root: '技术中台', mid: ['智汇云产品部', '基础研发部', '数据平台部'] },
    { name: '职能平台', root: '职能平台', mid: ['运营管理中心', '战略和投资中心', '人力资源中心', '财务中心'] }
  ];
  var TEAM = ['中间件', '大数据', '裸金属', '存储', '网络', '安全合规', '交付支持', '解决方案', '客户成功', '平台研发', '算法组', '运维组'];
  var USERS = [
    '张伟(zhangwei1)', '李娜(lina2)', '王强(wangqiang3)', '刘洋(liuyang4)', '陈静(chenjing5)',
    '杨帆(yangfan6)', '赵磊(zhaolei7)', '黄敏(huangmin8)', '周涛(zhoutao9)', '吴迪(wudi10)',
    '徐亮(xuliang11)', '孙杰(sunjie12)', '马超(machao13)', '朱琳(zhulin14)', '胡兵(hubing15)'
  ];

  function buildUnits() {
    var rows = SEED.map(function (r, i) {
      return {
        id: i + 1, name: r[0], org: r[1], admins: r[2], groups: r[3],
        tagId: unitTagIdOf(unitTagOf(r[0], r[1], i))
      };
    });

    // 枚举 (事业群 → 二级部门 → 小组) 的全部组合，保证结算单元名称唯一；
    // 组合用尽后追加轮次后缀继续补足到 262 条。
    var combos = [];
    BU.forEach(function (bu) {
      bu.mid.forEach(function (mid) {
        TEAM.forEach(function (team) {
          combos.push({ bu: bu, mid: mid, team: team });
        });
      });
    });

    var used = Object.create(null);
    rows.forEach(function (r) { used[r.name] = true; });

    for (var i = rows.length; rows.length < 262; i++) {
      var c = combos[i % combos.length];
      var round = Math.floor(i / combos.length);
      var team = round === 0 ? c.team : c.team + (round + 1);
      var name = c.bu.name + '-' + c.mid + '-' + team;
      if (used[name]) continue;
      used[name] = true;
      rows.push({
        id: rows.length + 1,
        name: name,
        org: c.bu.root + '/' + c.mid + '/' + c.mid + '-' + team,
        admins: USERS[i % USERS.length] + '、' + USERS[(i + 1 + (i % (USERS.length - 1))) % USERS.length],
        groups: i % 11,
        // 构造部分「无标签」结算单元，用于验证无标签筛选
        tagId: (i % 6 === 0) ? null : unitTagIdOf(unitTagOf(name, c.bu.root + '/' + c.mid + '/' + c.mid + '-' + team, i))
      });
    }
    return rows;
  }

  var UNITS = buildUnits();

  /* ==========================================================
     数据：资源组
     ========================================================== */
  // 前 10 条与线上第 1 页一致
  var RG_SEED = [
    ['AI_NATIVE_PET', 6560, 6, '智慧生活-产品线中心-儿童穿戴业务'],
    ['AIcoding资源组', 6559, 2, '互联网产品事业群-PC安全与办公事业部-PC安全卫士'],
    ['智汇云-系统运维部-智企专用资源组', 6557, 0, '智汇云-系统运维部'],
    ['效能工程部-AIcoding-智企资源组', 6556, 0, '效能工程部-AIcoding'],
    ['智汇云-网关系统', 6555, 8, '智汇云-应用平台部'],
    ['医疗fed项目', 6550, 1, '互联网-安全云-企业安全云产品-总部安全运营中心'],
    ['新DB资源映射', 6549, 2, '智汇云-基础架构部-中间件'],
    ['产品测试资源组', 6547, 2, '智汇云-云平台部-裸金属'],
    ['test资源组', 6545, 0, '智汇云-基础架构部-中间件'],
    ['大数据离线计算资源组', 6544, 12, '智汇云-系统部-大数据']
  ];

  var RG_PREFIX = ['智汇云', '互联网', '数字安全', '技术中台', '职能平台', '智慧生活', '效能工程部'];
  var RG_SUFFIX = [
    '测试资源组', '生产资源组', '预发资源组', '灰度资源组', '离线计算资源组',
    '在线服务资源组', '容器资源组', '存储资源组', '网关资源组', '大数据资源组',
    '算法训练资源组', '日志采集资源组'
  ];

  // 资源组标签：用来把多个资源组标记成一组，便于筛选与展示。
  // 一个资源组对应 1 个标签（可为空），一个标签可对应多个资源组。
  var RG_TAG_NAMES = [
    'AI大模型', 'Web服务', '大数据', '容器', '存储', '网关', '数据库',
    '中间件', '离线计算', '在线服务', '日志采集', '算法训练',
    '测试', '生产', '预发', '灰度', '安全合规', '交付支持', '客户成功'
  ];
  var rgTagSeq = RG_TAG_NAMES.length + 1;
  var rgTags = RG_TAG_NAMES.map(function (name, i) { return { id: i + 1, name: name }; });

  function findRgTag(tagId) {
    for (var i = 0; i < rgTags.length; i++) {
      if (rgTags[i].id === tagId) return rgTags[i];
    }
    return null;
  }
  function rgTagName(tagId) {
    var t = findRgTag(tagId);
    return t ? t.name : null;
  }
  // 标签名 → 标签 id；不存在则自动创建（用于初始推断）
  function rgTagIdOf(name) {
    for (var i = 0; i < rgTags.length; i++) {
      if (rgTags[i].name === name) return rgTags[i].id;
    }
    var id = rgTagSeq++;
    rgTags.push({ id: id, name: name });
    return id;
  }
  // 统计某个标签关联的资源组数
  function rgTagCount(tagId) {
    var n = 0;
    GROUPS.forEach(function (g) { if (g.tagId === tagId) n++; });
    return n;
  }

  // 按名称/所属单元推断唯一标签，取不到再按序轮转兜底
  function rgTagOf(name, unit, i) {
    if (name.indexOf('AIcoding') > -1 || unit.indexOf('AI') > -1) return 'AI大模型';
    if (name.indexOf('大数据') > -1 || name.indexOf('离线') > -1) return '大数据';
    if (name.indexOf('容器') > -1) return '容器';
    if (name.indexOf('存储') > -1) return '存储';
    if (name.indexOf('网关') > -1) return '网关';
    if (name.indexOf('日志') > -1) return '日志采集';
    if (name.indexOf('算法') > -1) return '算法训练';
    if (name.indexOf('测试') > -1 || name.indexOf('test') > -1) return '测试';
    if (name.indexOf('生产') > -1) return '生产';
    if (name.indexOf('预发') > -1) return '预发';
    if (name.indexOf('灰度') > -1) return '灰度';
    if (unit.indexOf('中间件') > -1) return '中间件';
    if (name.indexOf('医疗') > -1) return '交付支持';
    return RG_TAG_NAMES[i % RG_TAG_NAMES.length];
  }

  function buildGroups() {
    var rows = RG_SEED.map(function (r, i) {
      return {
        id: i + 1, name: r[0], gid: r[1], count: r[2], unit: r[3],
        tagId: rgTagIdOf(rgTagOf(r[0], r[3], i))
      };
    });

    var used = Object.create(null);
    rows.forEach(function (r) { used[r.name] = true; });

    var nextId = 6543;
    for (var i = 0; rows.length < 186; i++) {
      var prefix = RG_PREFIX[i % RG_PREFIX.length];
      var suffix = RG_SUFFIX[Math.floor(i / RG_PREFIX.length) % RG_SUFFIX.length];
      var round = Math.floor(i / (RG_PREFIX.length * RG_SUFFIX.length));
      var name = prefix + '-' + suffix + (round === 0 ? '' : round + 1);
      if (used[name]) continue;
      used[name] = true;
      var unit = UNITS[i % UNITS.length].name;
      rows.push({
        id: rows.length + 1,
        name: name,
        gid: nextId--,
        count: i % 15,
        unit: unit,
        // 构造部分「无标签」资源组，用于验证无标签筛选
        tagId: (i % 5 === 0) ? null : rgTagIdOf(rgTagOf(name, unit, i))
      });
    }
    return rows;
  }

  var GROUPS = buildGroups();

  /* ==========================================================
     通用列表控制器
     ========================================================== */
  function createList(cfg) {
    var state = { keyword: '', extra: '', tag: '', page: 1, pageSize: 10 };
    var pageRows = [];
    var tbody = $(cfg.tbody);
    var emptyTip = $(cfg.emptyTip);
    var searchInput = $(cfg.searchInput);
    var pager = $(cfg.pager);
    var jumpInput = $(cfg.jumpInput);

    function filtered() {
      var kw = state.keyword.trim().toLowerCase();
      return cfg.data.filter(function (r) {
        if (kw && !cfg.match(r, kw)) return false;
        if (state.extra && !cfg.matchExtra(r, state.extra)) return false;
        if (state.tag && !cfg.matchTag(r, state.tag)) return false;
        return true;
      });
    }

    // 分页按钮：首页、当前页附近、末页，超出用 … 折叠
    function pageNumbers(totalPages) {
      if (totalPages <= 7) {
        return Array.apply(null, { length: totalPages }).map(function (_, i) { return i + 1; });
      }
      var cur = state.page;
      if (cur <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
      if (cur >= totalPages - 3) {
        return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      }
      return [1, '...', cur - 1, cur, cur + 1, '...', totalPages];
    }

    function renderPager(totalPages) {
      pager.innerHTML = pageNumbers(totalPages).map(function (p) {
        if (p === '...') return '<button class="page-btn dots" type="button" disabled>•••</button>';
        return '<button class="page-btn' + (p === state.page ? ' active' : '') +
          '" type="button" data-page="' + p + '">' + p + '</button>';
      }).join('');
    }

    function render() {
      var list = filtered();
      var total = list.length;
      var totalPages = Math.max(1, Math.ceil(total / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;

      var start = (state.page - 1) * state.pageSize;
      pageRows = list.slice(start, start + state.pageSize);
      tbody.innerHTML = pageRows.map(cfg.row).join('');

      emptyTip.hidden = total !== 0;
      $(cfg.totalCount).textContent = total;
      $(cfg.currentPage).textContent = state.page;
      $(cfg.totalPages).textContent = totalPages;
      $(cfg.prevPage).disabled = state.page <= 1;
      $(cfg.nextPage).disabled = state.page >= totalPages;

      renderPager(totalPages);
      if (cfg.afterRender) cfg.afterRender(pageRows);
    }

    function doSearch() {
      state.keyword = searchInput.value;
      state.page = 1;
      render();
    }

    $(cfg.searchBtn).addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSearch();
    });

    pager.addEventListener('click', function (e) {
      var btn = e.target.closest('.page-btn[data-page]');
      if (!btn) return;
      state.page = parseInt(btn.dataset.page, 10);
      render();
    });

    $(cfg.prevPage).addEventListener('click', function () {
      if (state.page > 1) { state.page--; render(); }
    });

    $(cfg.nextPage).addEventListener('click', function () {
      state.page++;
      render();
    });

    $(cfg.pageSize).addEventListener('change', function (e) {
      state.pageSize = parseInt(e.target.value, 10);
      state.page = 1;
      render();
    });

    jumpInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var n = parseInt(jumpInput.value, 10);
      if (!isNaN(n) && n >= 1) { state.page = n; render(); }
      jumpInput.value = '';
    });

    if (cfg.extraSelect) {
      var sel = $(cfg.extraSelect);
      sel.classList.add('placeholder');
      sel.addEventListener('change', function () {
        state.extra = sel.value;
        sel.classList.toggle('placeholder', !sel.value);
        state.page = 1;
        render();
      });
    }

    // 可搜索标签下拉：选项由 cfg.tagOptions() 动态提供（标签可增删改）
    var resetTagFilter = null;
    var setTagFilter = null;
    if (cfg.tagSelect) {
      var tsel = $(cfg.tagSelect);
      var tbox = $(cfg.tagBox);
      var tclear = $(cfg.tagClear);
      var optionsOf = function () {
        return typeof cfg.tagOptions === 'function' ? cfg.tagOptions() : cfg.tagOptions;
      };
      var optionHtml = function (list, withNone) {
        var none = withNone
          ? '<div class="tag-option tag-option-none" data-tag="__none__">无标签</div>'
          : '';
        return none + list.map(function (t) {
          return '<div class="tag-option" data-tag="' + escapeHtml(t.id) + '">' + escapeHtml(t.name) + '</div>';
        }).join('');
      };
      resetTagFilter = function () {
        state.tag = '';
        tsel.value = '';
        tsel.classList.add('placeholder');
        if (tclear) tclear.hidden = true;
      };
      // 程序化选中标签（点击标签关联数跳转筛选时使用）
      setTagFilter = function (tagId) {
        var opts = optionsOf();
        var name = '';
        for (var i = 0; i < opts.length; i++) {
          if (String(opts[i].id) === String(tagId)) { name = opts[i].name; break; }
        }
        state.tag = String(tagId);
        tsel.value = name;
        tsel.classList.remove('placeholder');
        if (tclear) tclear.hidden = false;
        tbox.hidden = true;
        state.page = 1;
        render();
      };
      tsel.addEventListener('input', function () {
        var q = tsel.value.trim().toLowerCase();
        tbox.innerHTML = '';
        if (!q) { tbox.hidden = true; return; }
        var hits = optionsOf().filter(function (t) { return t.name.toLowerCase().indexOf(q) > -1; });
        tbox.innerHTML = hits.length ? optionHtml(hits, false) : '<div class="tag-option empty">无匹配标签</div>';
        tbox.hidden = false;
      });
      tbox.addEventListener('click', function (e) {
        var opt = e.target.closest('.tag-option[data-tag]');
        if (!opt) return;
        state.tag = opt.dataset.tag;
        tsel.value = opt.textContent;
        tsel.classList.remove('placeholder');
        if (tclear) tclear.hidden = false;
        tbox.hidden = true;
        state.page = 1;
        render();
      });
      tsel.addEventListener('focus', function () {
        if (!tsel.value) {
          tbox.innerHTML = optionHtml(optionsOf(), true);
          tbox.hidden = false;
        }
      });
      tsel.addEventListener('keydown', function (e) { if (e.key === 'Enter') tbox.hidden = true; });
      if (tclear) {
        tclear.addEventListener('click', function () {
          resetTagFilter();
          state.page = 1;
          render();
        });
      }
      document.addEventListener('click', function (e) {
        if (tbox.hidden) return;
        if (e.target.closest('.tag-select')) return;
        tbox.hidden = true;
      });
    }

    render();
    return {
      render: render,
      pageRows: function () { return pageRows; },
      currentTag: function () { return state.tag; },
      resetTag: function () { if (resetTagFilter) resetTagFilter(); },
      setTag: function (tagId) { if (setTagFilter) setTagFilter(tagId); }
    };
  }

  /* ---------- 视图 1：结算单元 ---------- */
  // 标签筛选下拉：标签可增删改，因此每次变更后重建选项
  function fillUnitTagOptions() {
    var sel = $('su-tag-filter');
    var cur = sel.value;
    sel.innerHTML = '<option value="">请选择标签</option>' +
      '<option value="__none__">无标签</option>' +
      unitTags.map(function (t) {
        return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>';
      }).join('');
    // 原选中标签若已被移除，回落到「全部」；「无标签」为固定筛选项
    var exists = cur === '__none__' || !!findUnitTag(parseInt(cur, 10));
    var next = exists ? cur : '';
    sel.value = next;
    sel.classList.toggle('placeholder', !next);
    // 下拉值发生变化时（标签被移除导致回落），同步列表内部筛选状态
    if (next !== cur) sel.dispatchEvent(new Event('change'));
    return next;
  }
  fillUnitTagOptions();

  // 已选中的结算单元 id（跨分页保留）
  var selectedUnits = Object.create(null);
  var selectedCount = 0;

  var checkAll = $('su-check-all');
  var batchBar = $('su-batch-bar');

  var suList = createList({
    data: UNITS,
    tbody: 'table-body',
    emptyTip: 'empty-tip',
    searchInput: 'search-input',
    searchBtn: 'search-btn',
    pager: 'pager',
    jumpInput: 'jump-input',
    pageSize: 'page-size',
    totalCount: 'total-count',
    currentPage: 'current-page',
    totalPages: 'total-pages',
    prevPage: 'prev-page',
    nextPage: 'next-page',
    extraSelect: 'su-tag-filter',
    match: function (r, kw) { return r.name.toLowerCase().indexOf(kw) > -1; },
    matchExtra: function (r, tagId) {
      if (tagId === '__none__') return r.tagId == null;
      return String(r.tagId) === String(tagId);
    },
    row: function (r) {
      var name = unitTagName(r.tagId);
      return '<tr' + (selectedUnits[r.id] ? ' class="row-selected"' : '') + '>' +
        '<td class="col-check">' +
        '<label class="chk"><input type="checkbox" class="su-row-check" data-id="' + r.id + '"' +
        (selectedUnits[r.id] ? ' checked' : '') + ' aria-label="选择 ' + escapeHtml(r.name) + '">' +
        '<span class="chk-box"></span></label>' +
        '</td>' +
        '<td>' + escapeHtml(r.name) + '</td>' +
        '<td>' + (name ? '<span class="tag-chip">' + escapeHtml(name) + '</span>' : '<span class="tag-none">-</span>') + '</td>' +
        '<td>' + escapeHtml(r.org) + '</td>' +
        '<td>' + escapeHtml(r.admins) + '</td>' +
        '<td class="col-num"><a class="link-num" href="#">' + r.groups + '</a></td>' +
        '</tr>';
    },
    afterRender: function (rows) { syncCheckAll(rows); }
  });

  /* ---------- 结算单元：勾选与批量操作 ---------- */
  // 全选框状态跟随当前页：全选 / 半选 / 未选
  function syncCheckAll(rows) {
    var hit = rows.filter(function (r) { return selectedUnits[r.id]; }).length;
    checkAll.checked = rows.length > 0 && hit === rows.length;
    checkAll.indeterminate = hit > 0 && hit < rows.length;
    checkAll.disabled = rows.length === 0;
  }

  function syncBatchBar() {
    $('su-selected-count').textContent = selectedCount;
    batchBar.hidden = selectedCount === 0;
  }

  function setSelected(id, on) {
    if (on && !selectedUnits[id]) { selectedUnits[id] = true; selectedCount++; }
    else if (!on && selectedUnits[id]) { delete selectedUnits[id]; selectedCount--; }
  }

  function clearSelection() {
    selectedUnits = Object.create(null);
    selectedCount = 0;
    syncBatchBar();
    suList.render();
  }

  $('table-body').addEventListener('change', function (e) {
    var box = e.target.closest('.su-row-check');
    if (!box) return;
    setSelected(parseInt(box.dataset.id, 10), box.checked);
    box.closest('tr').classList.toggle('row-selected', box.checked);
    syncCheckAll(suList.pageRows());
    syncBatchBar();
  });

  checkAll.addEventListener('change', function () {
    var on = checkAll.checked;
    suList.pageRows().forEach(function (r) { setSelected(r.id, on); });
    syncBatchBar();
    suList.render();
  });

  $('su-clear-select').addEventListener('click', clearSelection);

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    $('toast-text').textContent = msg;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 2200);
  }

  /* ---------- 确认弹窗（通用） ---------- */
  var confirmAction = null;
  function openConfirm(text, onOk) {
    $('confirm-text').innerHTML = text;
    confirmAction = onOk;
    $('confirm-mask').hidden = false;
  }
  function closeConfirm() {
    $('confirm-mask').hidden = true;
    confirmAction = null;
  }
  $('confirm-cancel').addEventListener('click', closeConfirm);
  $('confirm-close').addEventListener('click', closeConfirm);
  $('confirm-ok').addEventListener('click', function () {
    var fn = confirmAction;
    closeConfirm();
    if (fn) fn();
  });
  $('confirm-mask').addEventListener('click', function (e) {
    if (e.target === $('confirm-mask')) closeConfirm();
  });

  /* ---------- 标签管理抽屉（结算单元 / 资源组共用） ---------- */
  // 两类标签的数据结构一致（{id,name} 实体 + 行上的 tagId），
  // 差异收敛到 scope 里，抽屉与批量弹框因此可以完全复用。
  var SCOPES = {
    unit: {
      key: 'unit',
      entity: '结算单元',
      tip: '标签用于标识结算单元的内外属性、部门属性等，建议控制在 10 个以内。' +
        '一个结算单元只能设置 1 个标签，一个标签可关联多个结算单元。',
      maxLen: 12,
      tags: function () { return unitTags; },
      find: findUnitTag,
      count: unitTagCount,
      add: function (name) { unitTags.push({ id: unitTagSeq++, name: name }); },
      rename: function (id, name) { findUnitTag(id).name = name; },
      remove: function (id) {
        UNITS.forEach(function (u) { if (u.tagId === id) u.tagId = null; });
        unitTags = unitTags.filter(function (t) { return t.id !== id; });
      },
      assign: function (tagId) {
        UNITS.forEach(function (u) { if (selectedUnits[u.id]) u.tagId = tagId; });
      },
      selectedCount: function () { return selectedCount; },
      clearSelection: function () { clearSelection(); },
      refresh: function () { fillUnitTagOptions(); suList.render(); }
    },
    rg: {
      key: 'rg',
      entity: '资源组',
      tip: '资源组标签用于把多个资源组标记为一组，便于筛选与集中展示。' +
        '一个资源组只能设置 1 个标签，一个标签可关联多个资源组。',
      maxLen: 12,
      tags: function () { return rgTags; },
      find: findRgTag,
      count: rgTagCount,
      add: function (name) { rgTags.push({ id: rgTagSeq++, name: name }); },
      rename: function (id, name) { findRgTag(id).name = name; },
      remove: function (id) {
        GROUPS.forEach(function (g) { if (g.tagId === id) g.tagId = null; });
        rgTags = rgTags.filter(function (t) { return t.id !== id; });
      },
      assign: function (tagId) {
        GROUPS.forEach(function (g) { if (selectedGroups[g.id]) g.tagId = tagId; });
      },
      selectedCount: function () { return rgSelectedCount; },
      clearSelection: function () { clearRgSelection(); },
      refresh: function () {
        // 当前筛选标签若被移除，下拉回落到「全部」；「无标签」为固定筛选项，不回落
        var cur = rgList.currentTag();
        if (cur && cur !== '__none__' && !findRgTag(parseInt(cur, 10))) rgList.resetTag();
        rgList.render();
      }
    }
  };

  var tagScope = SCOPES.unit;   // 抽屉/弹框当前作用的实体
  var tagSearchKeyword = '';    // 抽屉内标签名称搜索关键字

  function tagFilteredTags() {
    var kw = tagSearchKeyword.trim().toLowerCase();
    if (!kw) return tagScope.tags();
    return tagScope.tags().filter(function (t) {
      return t.name.toLowerCase().indexOf(kw) > -1;
    });
  }

  function renderTagList() {
    var box = $('tag-list');
    var list = tagFilteredTags();
    box.innerHTML = list.map(function (t) {
      var n = tagScope.count(t.id);
      return '<li class="tag-item" data-id="' + t.id + '">' +
        '<span class="tag-chip">' + escapeHtml(t.name) + '</span>' +
        '<span class="tag-item-count" data-act="count" title="筛选关联的' + tagScope.entity + '">' + n + ' 个</span>' +
        '<div class="tag-item-ops">' +
        '<button class="btn-link" data-act="edit" type="button">编辑</button>' +
        '<button class="btn-link danger" data-act="remove" type="button">移除</button>' +
        '</div></li>';
    }).join('');
    // 有关键字时提示「无匹配标签」，无关键字时提示「暂无标签」
    $('tag-list-empty').textContent = tagSearchKeyword.trim()
      ? '无匹配标签'
      : '暂无标签，请先添加';
    $('tag-list-empty').hidden = list.length > 0;
  }

  // 标签变更后：抽屉列表、筛选控件、表格标签列同步刷新
  function refreshAfterTagChange() {
    renderTagList();
    tagScope.refresh();
  }

  function tagNameError(name, exceptId) {
    var list = tagScope.tags();
    if (!name) return '请输入标签名称';
    if (name.length > tagScope.maxLen) return '标签名称不超过 ' + tagScope.maxLen + ' 个字符';
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name && list[i].id !== exceptId) return '标签名称已存在';
    }
    return '';
  }

  function openDrawer(scope) {
    tagScope = scope;
    tagSearchKeyword = '';
    $('tag-search-input').value = '';
    $('tag-drawer-title').textContent = scope.entity + '标签管理';
    $('tag-drawer-tip').textContent = scope.tip;
    $('tag-list-head-right').textContent = '关联' + scope.entity;
    $('tag-list-empty').textContent = '暂无标签，请先添加';
    renderTagList();
    $('tag-mask').hidden = false;
    $('tag-drawer').hidden = false;
  }
  function closeDrawer() {
    $('tag-drawer').hidden = true;
    $('tag-mask').hidden = true;
  }

  $('su-tag-manage').addEventListener('click', function () { openDrawer(SCOPES.unit); });
  $('rg-tag-manage').addEventListener('click', function () { openDrawer(SCOPES.rg); });
  $('tag-drawer-close').addEventListener('click', closeDrawer);
  $('tag-mask').addEventListener('click', closeDrawer);

  // 标签管理抽屉：按标签名称搜索
  $('tag-search-btn').addEventListener('click', function () {
    tagSearchKeyword = $('tag-search-input').value;
    renderTagList();
  });
  $('tag-search-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      tagSearchKeyword = $('tag-search-input').value;
      renderTagList();
    }
  });

  /* ---------- 标签名称弹窗：添加 / 编辑共用 ---------- */
  var tagNameMode = 'add';      // 'add' | 'edit'
  var tagNameEditId = null;     // 编辑时的标签 id

  function showTagNameError(msg) {
    $('tag-name-error').textContent = msg;
    $('tag-name-error').hidden = !msg;
  }

  function openTagNameModal(mode, id) {
    tagNameMode = mode;
    tagNameEditId = id;
    showTagNameError('');
    $('tag-name-title').textContent = mode === 'edit' ? '编辑标签' : '添加标签';
    var input = $('tag-name-input');
    input.maxLength = tagScope.maxLen;
    input.value = mode === 'edit' && id ? (tagScope.find(id) ? tagScope.find(id).name : '') : '';
    $('tag-name-mask').hidden = false;
    setTimeout(function () { input.focus(); if (mode === 'edit') input.select(); }, 0);
  }

  function closeTagNameModal() {
    $('tag-name-mask').hidden = true;
  }

  function submitTagName() {
    var input = $('tag-name-input');
    var name = input.value.trim();
    var err = tagNameError(name, tagNameMode === 'edit' ? tagNameEditId : null);
    if (err) { showTagNameError(err); return; }
    if (tagNameMode === 'edit') {
      tagScope.rename(tagNameEditId, name);
      closeTagNameModal();
      refreshAfterTagChange();
      toast('标签已更新为「' + name + '」');
    } else {
      tagScope.add(name);
      closeTagNameModal();
      refreshAfterTagChange();
      toast('标签「' + name + '」已添加');
    }
  }

  $('tag-add-btn').addEventListener('click', function () { openTagNameModal('add', null); });
  $('tag-name-confirm').addEventListener('click', submitTagName);
  $('tag-name-cancel').addEventListener('click', closeTagNameModal);
  $('tag-name-close').addEventListener('click', closeTagNameModal);
  $('tag-name-mask').addEventListener('click', function (e) {
    if (e.target === $('tag-name-mask')) closeTagNameModal();
  });
  $('tag-name-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') submitTagName();
  });
  $('tag-name-input').addEventListener('input', function () { showTagNameError(''); });

  // 点击标签关联数量：关闭抽屉，跳转到对应列表并按该标签筛选
  function filterByTagFromDrawer(id) {
    closeDrawer();
    var scope = tagScope;
    if (scope.key === 'rg') {
      showView('resourcegroup', '资源组管理');
      var links = document.querySelectorAll('.menu-link');
      links.forEach(function (n) { n.classList.toggle('active', n.dataset.page === 'resourcegroup'); });
      rgList.setTag(id);
    } else {
      showView('settlementunit', '结算单元');
      var menu = document.querySelectorAll('.menu-link');
      menu.forEach(function (n) { n.classList.toggle('active', n.dataset.page === 'settlementunit'); });
      var sel = $('su-tag-filter');
      sel.value = String(id);
      sel.classList.toggle('placeholder', false);
      sel.dispatchEvent(new Event('change'));
    }
  }

  $('tag-list').addEventListener('click', function (e) {
    var count = e.target.closest('.tag-item-count[data-act="count"]');
    if (count) {
      var li = count.closest('.tag-item');
      filterByTagFromDrawer(parseInt(li.dataset.id, 10));
      return;
    }
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var li = btn.closest('.tag-item');
    var id = parseInt(li.dataset.id, 10);
    var act = btn.dataset.act;

    if (act === 'edit') {
      openTagNameModal('edit', id);
      return;
    }
    if (act === 'remove') {
      var scope = tagScope;
      var tag = scope.find(id);
      var n = scope.count(id);
      var msg = n > 0
        ? '标签「' + escapeHtml(tag.name) + '」已关联 <b>' + n + '</b> 个' + scope.entity +
          '。移除后仅解除该标签与这些' + scope.entity + '的关联关系，' +
          scope.entity + '本身不会被删除，确认移除？'
        : '确认移除标签「' + escapeHtml(tag.name) + '」？移除后仅解除该标签与' +
          scope.entity + '的关联关系，' + scope.entity + '本身不会被删除。';
      openConfirm(msg, function () {
        scope.remove(id);
        refreshAfterTagChange();
        toast('标签「' + tag.name + '」已移除');
      });
    }
  });

  /* ---------- 批量设置标签（结算单元 / 资源组共用） ---------- */
  var batchScope = SCOPES.unit;

  function openBatchModal(scope) {
    batchScope = scope;
    var n = scope.selectedCount();
    if (!n) return;
    $('batch-count').textContent = n;
    $('batch-entity').textContent = scope.entity;
    $('batch-clear-entity').textContent = scope.entity;
    var sel = $('batch-tag-select');
    sel.innerHTML = '<option value="">请选择标签</option>' + scope.tags().map(function (t) {
      return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>';
    }).join('');
    sel.value = '';
    sel.disabled = false;
    $('batch-clear-tag').checked = false;
    $('batch-error').hidden = true;
    $('batch-mask').hidden = false;
  }
  function closeBatchModal() { $('batch-mask').hidden = true; }

  $('su-batch-tag').addEventListener('click', function () { openBatchModal(SCOPES.unit); });
  $('rg-batch-tag').addEventListener('click', function () { openBatchModal(SCOPES.rg); });
  $('batch-cancel').addEventListener('click', closeBatchModal);
  $('batch-close').addEventListener('click', closeBatchModal);
  $('batch-mask').addEventListener('click', function (e) {
    if (e.target === $('batch-mask')) closeBatchModal();
  });

  // 「清空标签」与「选择标签」互斥
  $('batch-clear-tag').addEventListener('change', function () {
    var sel = $('batch-tag-select');
    sel.disabled = this.checked;
    if (this.checked) sel.value = '';
    $('batch-error').hidden = true;
  });
  $('batch-tag-select').addEventListener('change', function () { $('batch-error').hidden = true; });

  $('batch-confirm').addEventListener('click', function () {
    var scope = batchScope;
    var clear = $('batch-clear-tag').checked;
    var val = $('batch-tag-select').value;
    if (!clear && !val) {
      var err = $('batch-error');
      err.textContent = '请选择标签，或勾选「清空所选' + scope.entity + '的标签」';
      err.hidden = false;
      return;
    }
    var tagId = clear ? null : parseInt(val, 10);
    var n = scope.selectedCount();
    var name = clear ? '' : scope.find(tagId).name;
    scope.assign(tagId);
    closeBatchModal();
    scope.clearSelection();
    toast(clear
      ? '已清空 ' + n + ' 个' + scope.entity + '的标签'
      : '已为 ' + n + ' 个' + scope.entity + '设置标签「' + name + '」');
  });

  // Esc 统一关闭浮层
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('confirm-mask').hidden) { closeConfirm(); return; }
    if (!$('batch-mask').hidden) { closeBatchModal(); return; }
    if (!$('tag-name-mask').hidden) { closeTagNameModal(); return; }
    if (!$('rg-form-mask').hidden) { closeRgForm(); return; }
    if (!$('tag-drawer').hidden) { closeDrawer(); return; }
  });

  /* ---------- 视图 2：资源组管理 ---------- */
  // 结算单元下拉：取资源组里出现过的结算单元，去重后按名称排序
  (function fillUnitOptions() {
    var seen = Object.create(null);
    var names = [];
    GROUPS.forEach(function (g) {
      if (seen[g.unit]) return;
      seen[g.unit] = true;
      names.push(g.unit);
    });
    names.sort();
    $('rg-unit-filter').insertAdjacentHTML('beforeend', names.map(function (n) {
      return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>';
    }).join(''));
  })();

  // 已选中的资源组 id（跨分页保留）
  var selectedGroups = Object.create(null);
  var rgSelectedCount = 0;
  var rgCheckAll = $('rg-check-all');

  var rgList = createList({
    // 标签筛选按 tagId 匹配，选项直接取自 rgTags 实体
    data: GROUPS,
    tbody: 'rg-table-body',
    emptyTip: 'rg-empty-tip',
    searchInput: 'rg-search-input',
    searchBtn: 'rg-search-btn',
    pager: 'rg-pager',
    jumpInput: 'rg-jump-input',
    pageSize: 'rg-page-size',
    totalCount: 'rg-total-count',
    currentPage: 'rg-current-page',
    totalPages: 'rg-total-pages',
    prevPage: 'rg-prev-page',
    nextPage: 'rg-next-page',
    extraSelect: 'rg-unit-filter',
    tagSelect: 'rg-tag-input',
    tagBox: 'rg-tag-dropdown',
    tagClear: 'rg-tag-clear',
    // 标签可增删改，选项每次展开时实时读取
    tagOptions: function () { return rgTags; },
    // 支持资源组 ID 或名称搜索
    match: function (r, kw) {
      return r.name.toLowerCase().indexOf(kw) > -1 || String(r.gid).indexOf(kw) > -1;
    },
    matchExtra: function (r, unit) { return r.unit === unit; },
    matchTag: function (r, tagId) {
      if (tagId === '__none__') return r.tagId == null;
      return String(r.tagId) === String(tagId);
    },
    row: function (r) {
      var name = rgTagName(r.tagId);
      return '<tr' + (selectedGroups[r.id] ? ' class="row-selected"' : '') + '>' +
        '<td class="col-check">' +
        '<label class="chk"><input type="checkbox" class="rg-row-check" data-id="' + r.id + '"' +
        (selectedGroups[r.id] ? ' checked' : '') + ' aria-label="选择 ' + escapeHtml(r.name) + '">' +
        '<span class="chk-box"></span></label>' +
        '</td>' +
        '<td>' + escapeHtml(r.name) + '</td>' +
        '<td>' + r.gid + '</td>' +
        '<td>' + r.count + '</td>' +
        '<td>' + (name ? '<span class="tag-chip">' + escapeHtml(name) + '</span>' : '<span class="tag-none">-</span>') + '</td>' +
        '<td>' + escapeHtml(r.unit) + '</td>' +
        '<td><div class="row-actions">' +
        '<a href="#">管理</a><span class="sep">|</span>' +
        '<a href="#" class="rg-edit" data-id="' + r.id + '">编辑</a><span class="sep">|</span>' +
        '<a href="#">删除</a>' +
        '</div></td>' +
        '</tr>';
    },
    afterRender: function (rows) { syncRgCheckAll(rows); }
  });

  /* ---------- 资源组：勾选与批量操作 ---------- */
  function syncRgCheckAll(rows) {
    var hit = rows.filter(function (r) { return selectedGroups[r.id]; }).length;
    rgCheckAll.checked = rows.length > 0 && hit === rows.length;
    rgCheckAll.indeterminate = hit > 0 && hit < rows.length;
    rgCheckAll.disabled = rows.length === 0;
  }

  function syncRgBatchBar() {
    $('rg-selected-count').textContent = rgSelectedCount;
    $('rg-batch-bar').hidden = rgSelectedCount === 0;
  }

  function setRgSelected(id, on) {
    if (on && !selectedGroups[id]) { selectedGroups[id] = true; rgSelectedCount++; }
    else if (!on && selectedGroups[id]) { delete selectedGroups[id]; rgSelectedCount--; }
  }

  function clearRgSelection() {
    selectedGroups = Object.create(null);
    rgSelectedCount = 0;
    syncRgBatchBar();
    rgList.render();
  }

  $('rg-table-body').addEventListener('change', function (e) {
    var box = e.target.closest('.rg-row-check');
    if (!box) return;
    setRgSelected(parseInt(box.dataset.id, 10), box.checked);
    box.closest('tr').classList.toggle('row-selected', box.checked);
    syncRgCheckAll(rgList.pageRows());
    syncRgBatchBar();
  });

  rgCheckAll.addEventListener('change', function () {
    var on = rgCheckAll.checked;
    rgList.pageRows().forEach(function (r) { setRgSelected(r.id, on); });
    syncRgBatchBar();
    rgList.render();
  });

  $('rg-clear-select').addEventListener('click', clearRgSelection);

  /* ---------- 资源组：创建 / 编辑 ---------- */
  // 结算单元下拉选项：取结算单元数据去重后排序
  function fillRgFormUnitOptions() {
    var names = [];
    UNITS.forEach(function (u) {
      if (names.indexOf(u.name) < 0) names.push(u.name);
    });
    names.sort();
    $('rg-form-unit').innerHTML = '<option value="">请选择结算单元</option>' +
      names.map(function (n) {
        return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>';
      }).join('');
  }
  fillRgFormUnitOptions();

  function fillRgFormTagOptions() {
    $('rg-form-tag').innerHTML = '<option value="">请选择标签（非必填）</option>' +
      rgTags.map(function (t) {
        return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>';
      }).join('');
  }

  var rgEditingId = null; // 正在编辑的资源组 id，null 表示新建
  var rgFormNameError = $('rg-form-name-error');
  var rgFormUnitError = $('rg-form-unit-error');

  function showRgFormNameError(msg) {
    rgFormNameError.textContent = msg;
    rgFormNameError.hidden = !msg;
  }
  function showRgFormUnitError(msg) {
    rgFormUnitError.textContent = msg;
    rgFormUnitError.hidden = !msg;
  }

  function openRgForm(id) {
    rgEditingId = id;
    fillRgFormTagOptions();
    showRgFormNameError('');
    showRgFormUnitError('');
    $('rg-form-title').textContent = id ? '编辑资源组' : '创建资源组';
    var row = id ? findGroupById(id) : null;
    $('rg-form-name').value = row ? row.name : '';
    $('rg-form-unit').value = row ? row.unit : '';
    $('rg-form-tag').value = row && row.tagId != null ? String(row.tagId) : '';
    $('rg-form-mask').hidden = false;
  }
  function closeRgForm() {
    $('rg-form-mask').hidden = true;
    rgEditingId = null;
  }

  function findGroupById(id) {
    for (var i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].id === id) return GROUPS[i];
    }
    return null;
  }

  $('rg-create').addEventListener('click', function () { openRgForm(null); });
  $('rg-form-cancel').addEventListener('click', closeRgForm);
  $('rg-form-close').addEventListener('click', closeRgForm);
  $('rg-form-mask').addEventListener('click', function (e) {
    if (e.target === $('rg-form-mask')) closeRgForm();
  });
  $('rg-form-name').addEventListener('input', function () { showRgFormNameError(''); });
  $('rg-form-unit').addEventListener('change', function () { showRgFormUnitError(''); });

  // 行内「编辑」链接
  $('rg-table-body').addEventListener('click', function (e) {
    var a = e.target.closest('.rg-edit');
    if (!a) return;
    e.preventDefault();
    openRgForm(parseInt(a.dataset.id, 10));
  });

  $('rg-form-confirm').addEventListener('click', function () {
    var name = $('rg-form-name').value.trim();
    var unit = $('rg-form-unit').value;
    var tagVal = $('rg-form-tag').value;

    var nameErr = name ? '' : '请输入资源组名称';
    var unitErr = unit ? '' : '请选择所属结算单元';
    showRgFormNameError(nameErr);
    showRgFormUnitError(unitErr);
    if (nameErr || unitErr) return;

    // 名称去重（编辑时排除自身）
    for (var i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].name === name && GROUPS[i].id !== rgEditingId) {
        showRgFormNameError('资源组名称已存在');
        return;
      }
    }

    var tagId = tagVal ? parseInt(tagVal, 10) : null;
    if (rgEditingId) {
      var row = findGroupById(rgEditingId);
      row.name = name;
      row.unit = unit;
      row.tagId = tagId;
      closeRgForm();
      rgList.render();
      toast('资源组已更新');
    } else {
      var gid = (function () {
        var min = Infinity;
        GROUPS.forEach(function (g) { if (g.gid < min) min = g.gid; });
        return min - 1;
      })();
      GROUPS.push({
        id: GROUPS.length + 1,
        name: name,
        gid: gid,
        count: 0,
        unit: unit,
        tagId: tagId
      });
      closeRgForm();
      fillUnitOptionsRefresh();
      rgList.render();
      toast('资源组「' + name + '」已创建');
    }
  });

  /* ---------- 结算单元筛选下拉随数据动态重建 ---------- */
  function fillUnitOptionsRefresh() {
    var sel = $('rg-unit-filter');
    var cur = sel.value;
    var seen = Object.create(null);
    var names = [];
    GROUPS.forEach(function (g) {
      if (seen[g.unit]) return;
      seen[g.unit] = true;
      names.push(g.unit);
    });
    names.sort();
    sel.innerHTML = '<option value="">请选择结算单元</option>' +
      names.map(function (n) {
        return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>';
      }).join('');
    var exists = cur === '' || names.indexOf(cur) > -1;
    sel.value = exists ? cur : '';
  }

  /* ==========================================================
     视图切换：侧边菜单
     ========================================================== */
  var PAGE_TITLE = { settlementunit: '结算单元', resourcegroup: '资源组管理' };

  function showView(key, label) {
    document.querySelectorAll('.view').forEach(function (v) {
      v.hidden = v.id !== 'view-' + (key || '');
    });
    document.querySelector('.page-title').textContent = PAGE_TITLE[key] || label;
    // 资源组管理页右上角带「帮助文档」入口
    $('help-doc').hidden = key !== 'resourcegroup';
  }

  document.querySelectorAll('.menu-link').forEach(function (item) {
    item.addEventListener('click', function () {
      document.querySelectorAll('.menu-link').forEach(function (n) { n.classList.remove('active'); });
      item.classList.add('active');
      showView(item.dataset.page, item.querySelector('span').textContent);
    });
  });
})();
