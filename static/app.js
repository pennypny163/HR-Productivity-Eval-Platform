/**
 * DPU Eval Platform - 前端交互逻辑
 * Claude-inspired Design · HR招聘方向 POC
 */

// ============================================================
// 全局状态
// ============================================================
const state = {
    overview: null,
    skus: [],
    generalEval: [],
    shortlist: [],
    professionalEval: [],
    finalTiering: [],
    dimensions: [],
    currentPage: 'overview'
};

// 颜色系统
const COLORS = {
    amber: '#d97706', orange: '#ea580c', indigo: '#6366f1',
    emerald: '#10b981', rose: '#e11d48', teal: '#0d9488',
    purple: '#7c3aed', blue: '#2563eb', gray: '#6b7280',
    sand: { 900: '#3d342a', 700: '#6e5f48', 500: '#a89a80', 300: '#ddd6c9', 100: '#f5f3ef' }
};
const TIER_COLORS = { S: '#f59e0b', A: '#6366f1', B: '#10b981', C: '#9ca3af' };
const TYPE_COLORS = { Agent: '#2563eb', Workflow: '#7c3aed', Skill: '#d97706', Component: '#0d9488', Model: '#e11d48' };
const DIM_COLORS = ['#d97706', '#7c3aed', '#2563eb', '#10b981', '#e11d48', '#0d9488'];
const DIM_ICONS = ['fa-file-alt', 'fa-filter', 'fa-user-tie', 'fa-tachometer-alt', 'fa-shield-alt', 'fa-handshake'];

const RUNTIME_LABELS = { real: '真实运行', simulated: '模拟运行', api_stub: 'API Stub', documentation_only: '仅文档' };
const TIER_LABELS = { S: 'S层 · 强专业生产力单元', A: 'A层 · 关键环节强', B: 'B层 · 基础可用', C: 'C层 · 组件辅助' };
const TIER_DESC = {
    S: '可直接作为招聘方向强专业生产力单元，推荐企业优先采购',
    A: '若干关键环节表现强劲，适合纳入招聘方案组合',
    B: '基础可用但专业深度不足，需与其他工具配合使用',
    C: '更适合作为组件或辅助能力，不建议独立面向企业采购'
};
const TIER_ICONS = { S: 'fa-crown', A: 'fa-star', B: 'fa-check', C: 'fa-puzzle-piece' };
const PAGE_TITLES = {
    overview: '评测概览', catalog: 'SKU 目录',
    'general-eval': '第一层 · 合格考', 'professional-eval': '第二层 · 专业考',
    tiering: '分层榜单', methodology: '方法论'
};

// ============================================================
// 工具函数
// ============================================================
async function fetchAPI(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}

function scoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 65) return '#d97706';
    if (score >= 50) return '#ea580c';
    return '#e11d48';
}

function el(id) { return document.getElementById(id); }

function animateNumber(element, target, duration = 600) {
    const start = 0;
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * eased;
        element.textContent = Number.isInteger(target) ? Math.round(current) : current.toFixed(1);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============================================================
// 初始化
// ============================================================
async function init() {
    try {
        const [overview, skus, generalEval, shortlist, professionalEval, finalTiering, dimensions] = await Promise.all([
            fetchAPI('/api/overview'), fetchAPI('/api/skus'), fetchAPI('/api/general-eval'),
            fetchAPI('/api/shortlist'), fetchAPI('/api/professional-eval'),
            fetchAPI('/api/final-tiering'), fetchAPI('/api/dimensions')
        ]);
        Object.assign(state, { overview, skus, generalEval, shortlist, professionalEval, finalTiering, dimensions });

        const navCount = el('nav-sku-count');
        if (navCount) navCount.textContent = skus.length;

        renderOverview();
        renderCatalog();
        renderGeneralEval();
        renderProfessionalEval();
        renderTiering();
        renderMethodology();
        bindEvents();
    } catch (err) {
        console.error('初始化失败:', err);
    }
}

// ============================================================
// 事件绑定
// ============================================================
function bindEvents() {
    // 导航
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page) switchPage(page);
        });
    });
    // 筛选
    el('filter-type')?.addEventListener('change', filterCatalog);
    el('filter-runtime')?.addEventListener('change', filterCatalog);
    // 弹窗关闭
    el('modal-close-btn')?.addEventListener('click', closeModal);
    el('modal-backdrop')?.addEventListener('click', closeModal);
    // ESC关闭弹窗
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function switchPage(page) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const section = el(`page-${page}`);
    if (section) {
        section.classList.remove('hidden');
        section.style.animation = 'none';
        section.offsetHeight;
        section.style.animation = '';
    }
    const btn = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (btn) btn.classList.add('active');
    const bc = el('breadcrumb-current');
    if (bc) bc.textContent = PAGE_TITLES[page] || page;
    state.currentPage = page;
    if (page === 'overview') setTimeout(renderOverviewCharts, 80);
    if (page === 'professional-eval') setTimeout(renderRadarChart, 80);
}

// ============================================================
// 概览页
// ============================================================
function renderOverview() {
    const o = state.overview;
    if (!o) return;
    const stats = [
        { label: '样本总数', value: o.total_skus, color: '#3d342a', isInt: true },
        { label: '合格通过', value: o.pass_count, color: '#10b981', isInt: true },
        { label: '平均合格分', value: o.avg_general_score, color: '#d97706', isInt: false },
        { label: '平均专业分', value: o.avg_professional_score, color: '#6366f1', isInt: false }
    ];
    el('overview-stats').innerHTML = stats.map((s, i) => `
        <div class="stat-card animate-in" style="animation-delay:${i * 60}ms">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value" style="color:${s.color}" data-target="${s.value}" data-int="${s.isInt}">${s.isInt ? 0 : '0.0'}</div>
        </div>
    `).join('');
    // 数字动画
    setTimeout(() => {
        el('overview-stats').querySelectorAll('.stat-value').forEach(v => {
            const target = parseFloat(v.dataset.target);
            animateNumber(v, target, 800);
        });
    }, 200);
    renderOverviewCharts();
}

function renderOverviewCharts() {
    const o = state.overview;
    if (!o) return;

    // 类型分布
    const typeEl = el('chart-type-dist');
    if (typeEl && typeEl.offsetHeight > 0) {
        const typeChart = echarts.init(typeEl);
        typeChart.setOption({
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: '#fff', borderColor: '#e7e0d5', borderWidth: 1, textStyle: { color: '#3d342a', fontSize: 12 } },
            color: Object.values(TYPE_COLORS),
            series: [{
                type: 'pie', radius: ['42%', '68%'], center: ['50%', '52%'],
                itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
                label: { show: true, formatter: '{b}\n{c}个', fontSize: 11, color: '#6e5f48', lineHeight: 16 },
                labelLine: { length: 12, length2: 8 },
                data: Object.entries(o.type_distribution).map(([name, value]) => ({ name, value })),
                animationType: 'scale', animationEasing: 'cubicOut'
            }]
        });
        window.addEventListener('resize', () => typeChart.resize());
    }

    // 分层分布
    const tierEl = el('chart-tier-dist');
    if (tierEl && tierEl.offsetHeight > 0) {
        const tierChart = echarts.init(tierEl);
        const tierOrder = ['S', 'A', 'B', 'C'];
        tierChart.setOption({
            tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e7e0d5', borderWidth: 1, textStyle: { color: '#3d342a', fontSize: 12 } },
            grid: { left: 40, right: 20, top: 20, bottom: 40 },
            xAxis: {
                type: 'category',
                data: tierOrder.map(t => `${t}层`),
                axisLine: { lineStyle: { color: '#e7e0d5' } },
                axisLabel: { color: '#6e5f48', fontSize: 12, fontWeight: 600 },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'value', minInterval: 1,
                axisLine: { show: false }, axisTick: { show: false },
                splitLine: { lineStyle: { color: '#f5f3ef' } },
                axisLabel: { color: '#a89a80', fontSize: 11 }
            },
            series: [{
                type: 'bar', barWidth: '45%',
                data: tierOrder.map(t => ({
                    value: o.tier_distribution[t] || 0,
                    itemStyle: { color: TIER_COLORS[t], borderRadius: [6, 6, 0, 0] }
                })),
                label: { show: true, position: 'top', fontWeight: 700, fontSize: 13, color: '#3d342a' },
                animationDelay: idx => idx * 100
            }]
        });
        window.addEventListener('resize', () => tierChart.resize());
    }

    // 得分矩阵
    const compareEl = el('chart-score-compare');
    if (compareEl && compareEl.offsetHeight > 0) {
        const compareChart = echarts.init(compareEl);
        const scatterData = state.finalTiering.map(t => ({
            value: [t.general_score, t.professional_score],
            name: t.sku_name, tier: t.tier,
            itemStyle: { color: TIER_COLORS[t.tier] || '#999', borderColor: '#fff', borderWidth: 1.5 }
        }));
        compareChart.setOption({
            tooltip: {
                trigger: 'item', backgroundColor: '#fff', borderColor: '#e7e0d5', borderWidth: 1,
                textStyle: { color: '#3d342a', fontSize: 12 },
                formatter: p => `<b>${p.data.name}</b><br/>合格分: ${p.data.value[0].toFixed(1)}<br/>专业分: ${p.data.value[1].toFixed(1)}<br/>分层: ${p.data.tier}层`
            },
            grid: { left: 55, right: 30, top: 25, bottom: 45 },
            xAxis: {
                name: '合格考得分', nameLocation: 'center', nameGap: 28, min: 50, max: 100,
                nameTextStyle: { color: '#8c7a5e', fontSize: 12 },
                axisLine: { lineStyle: { color: '#e7e0d5' } },
                axisLabel: { color: '#a89a80', fontSize: 11 },
                splitLine: { lineStyle: { color: '#f5f3ef', type: 'dashed' } }
            },
            yAxis: {
                name: '专业考得分', nameLocation: 'center', nameGap: 38, min: 40, max: 100,
                nameTextStyle: { color: '#8c7a5e', fontSize: 12 },
                axisLine: { lineStyle: { color: '#e7e0d5' } },
                axisLabel: { color: '#a89a80', fontSize: 11 },
                splitLine: { lineStyle: { color: '#f5f3ef', type: 'dashed' } }
            },
            series: [{
                type: 'scatter', symbolSize: 14, data: scatterData,
                label: { show: true, formatter: p => p.data.name.substring(0, 8), fontSize: 9, position: 'top', color: '#6e5f48' },
                emphasis: { scale: 1.6, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(61,52,42,0.2)' } }
            }]
        });
        window.addEventListener('resize', () => compareChart.resize());
    }
}

// ============================================================
// SKU目录
// ============================================================
function renderCatalog() {
    const grid = el('catalog-grid');
    if (!grid) return;
    grid.innerHTML = state.skus.map((sku, i) => createSKUCard(sku, i)).join('');
    const count = el('catalog-count');
    if (count) count.textContent = state.skus.length;
}

function createSKUCard(sku, index) {
    const typeClass = `badge-${sku.sku_type.toLowerCase()}`;
    const runtimeClass = `badge-${sku.runtime_mode}`;
    const features = [
        { label: '独立运行', active: sku.can_run_independently },
        { label: '工具调用', active: sku.has_tool_calling },
        { label: '多轮对话', active: sku.supports_multi_turn },
        { label: '开源', active: sku.is_open_source }
    ];
    return `
        <div class="sku-card animate-in" style="animation-delay:${index * 40}ms" data-sku-id="${sku.id}">
            <div class="flex items-start justify-between mb-2.5">
                <div class="flex-1 min-w-0 pr-2">
                    <h4 class="text-[13px] font-semibold text-sand-900 truncate">${sku.name_cn}</h4>
                    <p class="text-[11px] text-claude-muted mt-0.5 truncate font-mono">${sku.name}</p>
                </div>
            </div>
            <div class="flex gap-1.5 mb-3">
                <span class="badge ${typeClass}">${sku.sku_type}</span>
                <span class="badge ${runtimeClass}">${RUNTIME_LABELS[sku.runtime_mode] || sku.runtime_mode}</span>
            </div>
            <p class="text-xs text-claude-muted leading-relaxed mb-3 line-clamp-2">${sku.description}</p>
            <div class="flex flex-wrap gap-1 mb-3">
                ${sku.tags.slice(0, 3).map(t => `<span class="text-[10px] bg-sand-100 text-claude-muted px-1.5 py-0.5 rounded-md">${t}</span>`).join('')}
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-1 pt-2.5 border-t border-claude-border/50">
                ${features.filter(f => f.active).map(f => `<span class="feature-dot active">${f.label}</span>`).join('')}
            </div>
        </div>
    `;
}

function filterCatalog() {
    const typeFilter = el('filter-type')?.value || '';
    const runtimeFilter = el('filter-runtime')?.value || '';
    const filtered = state.skus.filter(sku => {
        if (typeFilter && sku.sku_type !== typeFilter) return false;
        if (runtimeFilter && sku.runtime_mode !== runtimeFilter) return false;
        return true;
    });
    const grid = el('catalog-grid');
    if (grid) grid.innerHTML = filtered.map((sku, i) => createSKUCard(sku, i)).join('');
    const count = el('catalog-count');
    if (count) count.textContent = filtered.length;
    // 重新绑定卡片点击
    bindCardClicks();
}

function bindCardClicks() {
    document.querySelectorAll('.sku-card').forEach(card => {
        card.addEventListener('click', () => {
            const skuId = card.dataset.skuId;
            if (skuId) showSKUDetail(skuId);
        });
    });
}

// ============================================================
// 第一层合格考
// ============================================================
function renderGeneralEval() {
    const results = state.generalEval;
    if (!results.length) return;
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const avgScore = (results.reduce((s, r) => s + r.total_score, 0) / results.length).toFixed(1);

    el('general-eval-stats').innerHTML = `
        <div class="stat-card">
            <div class="stat-label">通过</div>
            <div class="stat-value" style="color:#10b981">${passCount}</div>
            <div class="mt-1.5 score-bar-track"><div class="score-bar-fill" style="width:${passCount/results.length*100}%;background:#10b981"></div></div>
        </div>
        <div class="stat-card">
            <div class="stat-label">未通过</div>
            <div class="stat-value" style="color:#e11d48">${failCount}</div>
            <div class="mt-1.5 score-bar-track"><div class="score-bar-fill" style="width:${failCount/results.length*100}%;background:#e11d48"></div></div>
        </div>
        <div class="stat-card">
            <div class="stat-label">平均分</div>
            <div class="stat-value" style="color:#d97706">${avgScore}</div>
            <div class="mt-1.5 score-bar-track"><div class="score-bar-fill" style="width:${avgScore}%;background:#d97706"></div></div>
        </div>
    `;

    const tbody = el('general-eval-table');
    if (!tbody) return;
    tbody.innerHTML = results.map(r => {
        const sc = scoreColor(r.total_score);
        const statusBadge = r.status === 'pass'
            ? '<span class="badge badge-pass">✓ 通过</span>'
            : '<span class="badge badge-fail">✗ 未通过</span>';
        const vetoHtml = r.veto_triggered ? '<span class="text-[10px] text-rose-500 font-medium ml-1">⚠ 否决</span>' : '';
        const pathShort = r.eval_path.length > 18 ? r.eval_path.substring(0, 18) + '…' : r.eval_path;
        return `
            <tr data-sku-id="${r.sku_id}">
                <td class="td-cell">
                    <div class="text-[13px] font-medium text-sand-900">${r.sku_name}</div>
                    <div class="text-[10px] text-claude-muted font-mono mt-0.5">${r.sku_id}</div>
                </td>
                <td class="td-cell"><span class="badge badge-${r.sku_type.toLowerCase()}">${r.sku_type}</span></td>
                <td class="td-cell text-xs text-claude-muted" title="${r.eval_path}">${pathShort}</td>
                <td class="td-cell text-center">
                    <span class="font-bold text-sm" style="color:${sc}">${r.total_score.toFixed(1)}</span>
                </td>
                <td class="td-cell text-center">${statusBadge}${vetoHtml}</td>
                <td class="td-cell text-xs text-claude-muted">${r.status === 'fail' ? (r.fail_reasons[0] || '').substring(0, 28) : '达标'}</td>
                <td class="td-cell text-center">
                    <button class="detail-btn w-7 h-7 rounded-md hover:bg-sand-100 inline-flex items-center justify-center text-claude-muted hover:text-amber-600 transition-colors" data-sku-id="${r.sku_id}">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// 第二层专业考
// ============================================================
function renderProfessionalEval() {
    // 维度卡片
    el('dimension-cards').innerHTML = state.dimensions.map((d, i) => `
        <div class="dim-card animate-in" style="animation-delay:${i * 60}ms">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2" style="background:${DIM_COLORS[i]}15">
                <i class="fas ${DIM_ICONS[i]} text-sm" style="color:${DIM_COLORS[i]}"></i>
            </div>
            <h4 class="text-[11px] font-semibold text-sand-900 leading-tight">${d.name.replace('能力', '')}</h4>
        </div>
    `).join('');

    // 列表
    const listEl = el('professional-eval-list');
    if (!listEl) return;
    listEl.innerHTML = state.professionalEval.map((r, idx) => {
        const dimBars = r.dimensions.map((d, i) => {
            const c = scoreColor(d.score);
            return `
                <div class="score-item">
                    <span class="score-item-label truncate" title="${d.dimension_name}">${d.dimension_name.substring(0, 6)}</span>
                    <div class="score-item-bar"><div class="score-item-fill" style="width:${d.score}%;background:${c}"></div></div>
                    <span class="score-item-value" style="color:${c}">${d.score.toFixed(0)}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="p-5 hover:bg-sand-50/50 transition-colors animate-in" style="animation-delay:${idx * 50}ms">
                <div class="flex items-start gap-4">
                    <div class="tier-badge tier-${r.tier}">${r.tier}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 class="text-[13px] font-semibold text-sand-900">${r.sku_name}</h4>
                            <span class="badge badge-${r.sku_type.toLowerCase()}">${r.sku_type}</span>
                            <span class="text-sm font-bold" style="color:#d97706">${r.total_professional_score.toFixed(1)}</span>
                        </div>
                        <p class="text-xs text-claude-muted mb-3">${r.tier_reason}</p>
                        <div class="grid grid-cols-3 gap-x-4 gap-y-1.5">${dimBars}</div>
                    </div>
                    <button class="detail-btn w-7 h-7 rounded-md hover:bg-sand-100 flex items-center justify-center text-claude-muted hover:text-amber-600 transition-colors flex-shrink-0" data-sku-id="${r.sku_id}">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    renderRadarChart();
}

function renderRadarChart() {
    const chartEl = el('chart-radar');
    if (!chartEl || chartEl.offsetHeight === 0) return;
    const chart = echarts.init(chartEl);
    const dimNames = state.dimensions.map(d => d.name.replace('能力', '').substring(0, 6));

    const series = state.professionalEval.slice(0, 8).map((r, i) => ({
        name: r.sku_name.substring(0, 12),
        type: 'radar',
        data: [{ value: r.dimensions.map(d => d.score), name: r.sku_name.substring(0, 12) }],
        lineStyle: { width: 2, opacity: 0.8 },
        areaStyle: { opacity: 0.08 },
        itemStyle: { color: TIER_COLORS[r.tier] || '#999' },
        symbol: 'circle', symbolSize: 4
    }));

    chart.setOption({
        tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#e7e0d5', borderWidth: 1, textStyle: { color: '#3d342a', fontSize: 12 } },
        legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 10, color: '#6e5f48' }, pageTextStyle: { color: '#8c7a5e' } },
        radar: {
            indicator: dimNames.map(n => ({ name: n, max: 100 })),
            radius: '58%', center: ['50%', '48%'],
            splitNumber: 4,
            axisName: { fontSize: 11, color: '#6e5f48' },
            splitLine: { lineStyle: { color: '#ebe7df' } },
            splitArea: { areaStyle: { color: ['#faf9f7', '#f5f3ef', '#faf9f7', '#f5f3ef'] } },
            axisLine: { lineStyle: { color: '#ddd6c9' } }
        },
        series
    });
    window.addEventListener('resize', () => chart.resize());
}

// ============================================================
// 分层榜单
// ============================================================
function renderTiering() {
    const tiers = ['S', 'A', 'B', 'C'];
    const bgColors = { S: '#fffbeb', A: '#eef2ff', B: '#ecfdf5', C: '#f9fafb' };

    const content = tiers.map(tier => {
        const items = state.finalTiering.filter(t => t.tier === tier);
        if (items.length === 0) return '';

        const itemsHtml = items.map(item => {
            const recTags = [
                item.suitable_for_trial ? '<span class="rec-tag bg-emerald-50 text-emerald-700">可试用</span>' : '',
                item.suitable_for_listing ? '<span class="rec-tag bg-amber-50 text-amber-700">可上架</span>' : '',
                item.suitable_for_combo ? '<span class="rec-tag bg-blue-50 text-blue-700">可组合</span>' : '',
                item.suitable_for_custom_dev ? '<span class="rec-tag bg-purple-50 text-purple-700">可定开</span>' : ''
            ].filter(Boolean).join('');

            const dimBars = (item.dimensions || []).map(d => {
                const c = scoreColor(d.score);
                return `<div class="score-item">
                    <span class="score-item-label truncate">${d.dimension_name.substring(0, 5)}</span>
                    <div class="score-item-bar"><div class="score-item-fill" style="width:${d.score}%;background:${c}"></div></div>
                    <span class="score-item-value" style="color:${c}">${d.score.toFixed(0)}</span>
                </div>`;
            }).join('');

            return `
                <div class="p-5 border-b border-claude-border/30 last:border-0 hover:bg-sand-50/30 transition-colors">
                    <div class="flex items-start gap-4">
                        <div class="tier-badge tier-${tier} flex-shrink-0">${tier}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 class="text-[13px] font-semibold text-sand-900">${item.sku_name}</h4>
                                <span class="badge badge-${item.sku_type.toLowerCase()}">${item.sku_type}</span>
                                <span class="text-xs text-claude-muted">合格 <b class="text-sand-900">${item.general_score.toFixed(1)}</b></span>
                                <span class="text-xs text-claude-muted">专业 <b style="color:#d97706">${item.professional_score.toFixed(1)}</b></span>
                            </div>
                            <p class="text-xs text-claude-muted mb-2.5">${item.tier_reason}</p>
                            <div class="grid grid-cols-3 gap-x-4 gap-y-1 mb-3">${dimBars}</div>
                            <div class="flex flex-wrap gap-2 mb-2">
                                <span class="text-[11px] text-claude-muted"><i class="fas fa-crosshairs mr-1 text-amber-500"></i>${item.best_fit_stage}</span>
                                <span class="text-[11px] text-claude-muted"><i class="fas fa-user-tag mr-1 text-indigo-400"></i>${item.role_positioning}</span>
                            </div>
                            <div class="flex flex-wrap gap-1.5">${recTags}</div>
                        </div>
                        <button class="detail-btn w-7 h-7 rounded-md hover:bg-sand-100 flex items-center justify-center text-claude-muted hover:text-amber-600 transition-colors flex-shrink-0 mt-1" data-sku-id="${item.sku_id}">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="tier-section animate-in">
                <div class="tier-header" style="background:${bgColors[tier]}">
                    <div class="tier-badge tier-${tier}">${tier}</div>
                    <div>
                        <h3 class="text-sm font-semibold text-sand-900">${TIER_LABELS[tier]}</h3>
                        <p class="text-[11px] text-claude-muted">${TIER_DESC[tier]} · ${items.length}个SKU</p>
                    </div>
                </div>
                ${itemsHtml}
            </div>
        `;
    }).join('');

    el('tiering-content').innerHTML = content;
}

// ============================================================
// SKU详情弹窗
// ============================================================
async function showSKUDetail(skuId) {
    try {
        const data = await fetchAPI(`/api/skus/${skuId}`);
        el('modal-title').textContent = data.sku.name_cn;
        el('modal-body').innerHTML = renderDetailContent(data);
        el('sku-detail-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (data.professional_eval) {
            setTimeout(() => renderDetailRadar(data.professional_eval), 120);
        }
    } catch (err) {
        console.error('加载详情失败:', err);
    }
}

function closeModal() {
    el('sku-detail-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function renderDetailContent(data) {
    const { sku, general_eval, professional_eval, final_tiering } = data;
    let html = '';

    // 基本信息
    html += `
        <div class="detail-grid mb-5">
            <div>
                <div class="detail-item-label">名称</div>
                <div class="detail-item-value">${sku.name}</div>
            </div>
            <div>
                <div class="detail-item-label">厂商</div>
                <div class="detail-item-value">${sku.vendor}</div>
            </div>
            <div>
                <div class="detail-item-label">类型</div>
                <div><span class="badge badge-${sku.sku_type.toLowerCase()}">${sku.sku_type}</span></div>
            </div>
            <div>
                <div class="detail-item-label">运行模式</div>
                <div><span class="badge badge-${sku.runtime_mode}">${RUNTIME_LABELS[sku.runtime_mode] || sku.runtime_mode}</span></div>
            </div>
        </div>
        <div class="mb-5">
            <div class="detail-item-label">描述</div>
            <p class="text-[13px] text-sand-700 leading-relaxed mt-1">${sku.description}</p>
        </div>
        <div class="detail-grid mb-5">
            <div>
                <div class="detail-item-label">输入形态</div>
                <div class="text-[13px] text-sand-700">${sku.input_format}</div>
            </div>
            <div>
                <div class="detail-item-label">输出形态</div>
                <div class="text-[13px] text-sand-700">${sku.output_format}</div>
            </div>
        </div>
        <div class="flex flex-wrap gap-3 mb-5">
            ${[
                { label: '独立运行', active: sku.can_run_independently },
                { label: '工具调用', active: sku.has_tool_calling },
                { label: '多轮对话', active: sku.supports_multi_turn },
                { label: '开源', active: sku.is_open_source },
                { label: '本地Demo', active: sku.can_local_demo }
            ].map(f => `<span class="feature-dot ${f.active ? 'active' : 'inactive'}">${f.label}</span>`).join('')}
        </div>
        <div class="mb-4">
            <div class="detail-item-label">来源</div>
            <a href="${sku.source_url}" target="_blank" class="text-[13px] text-amber-600 hover:text-amber-700 hover:underline break-all">${sku.source_url}</a>
        </div>
    `;

    // 第一层
    if (general_eval) {
        const sc = scoreColor(general_eval.total_score);
        const statusBadge = general_eval.status === 'pass'
            ? '<span class="badge badge-pass">✓ 通过</span>'
            : '<span class="badge badge-fail">✗ 未通过</span>';
        html += `
            <div class="detail-section">
                <div class="detail-section-title">
                    <span class="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                    第一层合格考结果
                </div>
                <div class="flex items-center gap-3 mb-4">
                    ${statusBadge}
                    <span class="text-2xl font-bold" style="color:${sc}">${general_eval.total_score.toFixed(1)}</span>
                    <span class="text-xs text-claude-muted">/ 100</span>
                </div>
                <div class="text-xs text-claude-muted mb-4">评测路径: ${general_eval.eval_path}</div>
        `;

        if (general_eval.gpa_score) {
            const g = general_eval.gpa_score;
            html += `
                <div class="score-block">
                    <div class="score-block-title">Snowflake GPA 三阶段</div>
                    <div class="grid grid-cols-3 gap-4 text-center">
                        ${[{l:'Goal 目标',v:g.goal_score},{l:'Plan 规划',v:g.plan_score},{l:'Action 执行',v:g.action_score}].map(x => `
                            <div>
                                <div class="text-lg font-bold" style="color:${scoreColor(x.v)}">${x.v.toFixed(1)}</div>
                                <div class="text-[11px] text-claude-muted">${x.l}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (general_eval.amazon_agent_score) {
            const a = general_eval.amazon_agent_score;
            const items = [
                {l:'响应质量',v:a.final_response_quality},{l:'任务完成',v:a.task_completion},
                {l:'工具使用',v:a.tool_usage},{l:'安全性',v:a.safety},
                {l:'记忆/多轮',v:a.memory_multi_turn},{l:'推理一致',v:a.reasoning_consistency},
                {l:'错误恢复',v:a.error_recovery},{l:'成本性能',v:a.cost_performance}
            ];
            html += `
                <div class="score-block">
                    <div class="score-block-title">Amazon Agent 二维评估</div>
                    <div class="score-grid grid-cols-2">
                        ${items.map(x => `
                            <div class="score-item">
                                <span class="score-item-label">${x.l}</span>
                                <div class="score-item-bar"><div class="score-item-fill" style="width:${x.v}%;background:${scoreColor(x.v)}"></div></div>
                                <span class="score-item-value" style="color:${scoreColor(x.v)}">${x.v.toFixed(0)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (general_eval.amazon_layer_score) {
            const l = general_eval.amazon_layer_score;
            html += `
                <div class="score-block">
                    <div class="score-block-title">Amazon 三层评测 (${l.layer}层)</div>
                    <div class="text-center text-lg font-bold" style="color:${scoreColor(l.total_score)}">${l.total_score.toFixed(1)}</div>
                </div>
            `;
        }

        if (general_eval.veto_triggered) {
            html += `<div class="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[13px] text-rose-700"><i class="fas fa-exclamation-triangle mr-1.5"></i>一票否决: ${general_eval.veto_items.join('; ')}</div>`;
        }
        html += `</div>`;
    }

    // 第二层
    if (professional_eval) {
        html += `
            <div class="detail-section">
                <div class="detail-section-title">
                    <span class="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                    第二层招聘方向专业评测
                </div>
                <div class="flex items-center gap-3 mb-4">
                    <div class="tier-badge tier-${professional_eval.tier}">${professional_eval.tier}</div>
                    <span class="text-2xl font-bold" style="color:#d97706">${professional_eval.total_professional_score.toFixed(1)}</span>
                    <span class="text-xs text-claude-muted">/ 100</span>
                </div>
                <div id="detail-radar-chart" class="h-[260px] mb-4"></div>
                <div class="score-grid">
                    ${professional_eval.dimensions.map(d => {
                        const c = scoreColor(d.score);
                        return `<div class="score-item">
                            <span class="score-item-label" style="width:90px">${d.dimension_name.substring(0, 8)}</span>
                            <div class="score-item-bar"><div class="score-item-fill" style="width:${d.score}%;background:${c}"></div></div>
                            <span class="score-item-value" style="color:${c}">${d.score.toFixed(1)}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // 最终分层
    if (final_tiering) {
        html += `
            <div class="detail-section">
                <div class="detail-section-title">
                    <span class="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                    最终分层与建议
                </div>
                <div class="score-block">
                    <div class="grid grid-cols-2 gap-3 text-[13px]">
                        <div><span class="text-claude-muted">分层:</span> <b class="text-sand-900">${final_tiering.tier}层</b></div>
                        <div><span class="text-claude-muted">最适合阶段:</span> <span class="text-sand-700">${final_tiering.best_fit_stage}</span></div>
                        <div class="col-span-2"><span class="text-claude-muted">理由:</span> <span class="text-sand-700">${final_tiering.tier_reason}</span></div>
                        <div class="col-span-2"><span class="text-claude-muted">角色定位:</span> <span class="text-sand-700">${final_tiering.role_positioning}</span></div>
                        <div class="col-span-2"><span class="text-claude-muted">企业建议:</span> <span class="text-sand-700">${final_tiering.enterprise_recommendation}</span></div>
                    </div>
                    <div class="flex gap-1.5 mt-3 pt-3 border-t border-claude-border/50">
                        ${final_tiering.suitable_for_trial ? '<span class="rec-tag bg-emerald-50 text-emerald-700">✓ 适合试用</span>' : ''}
                        ${final_tiering.suitable_for_listing ? '<span class="rec-tag bg-amber-50 text-amber-700">✓ 适合上架</span>' : ''}
                        ${final_tiering.suitable_for_combo ? '<span class="rec-tag bg-blue-50 text-blue-700">✓ 适合组合</span>' : ''}
                        ${final_tiering.suitable_for_custom_dev ? '<span class="rec-tag bg-purple-50 text-purple-700">✓ 适合定开</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    return html;
}

function renderDetailRadar(profEval) {
    const chartEl = el('detail-radar-chart');
    if (!chartEl) return;
    const chart = echarts.init(chartEl);
    chart.setOption({
        radar: {
            indicator: profEval.dimensions.map(d => ({ name: d.dimension_name.substring(0, 6), max: 100 })),
            radius: '62%',
            splitLine: { lineStyle: { color: '#ebe7df' } },
            splitArea: { areaStyle: { color: ['#faf9f7', '#f5f3ef'] } },
            axisLine: { lineStyle: { color: '#ddd6c9' } },
            axisName: { color: '#6e5f48', fontSize: 10 }
        },
        series: [{
            type: 'radar',
            data: [{ value: profEval.dimensions.map(d => d.score), name: profEval.sku_name }],
            areaStyle: { opacity: 0.15, color: '#d97706' },
            lineStyle: { color: '#d97706', width: 2 },
            itemStyle: { color: '#d97706' },
            symbol: 'circle', symbolSize: 5
        }]
    });
}

// ============================================================
// 方法论
// ============================================================
function renderMethodology() {
    el('methodology-content').innerHTML = `
        <div class="method-card">
            <h3><span class="w-1.5 h-4 bg-amber-500 rounded-full inline-block"></span>为什么选择HR招聘场景</h3>
            <p>HR招聘是企业最常见的AI应用场景之一，具有以下特点使其成为理想的POC验证场景：</p>
            <ul>
                <li><b>流程标准化程度高</b>：从需求理解→JD生成→简历筛选→面试→Offer→入职，流程清晰可拆解</li>
                <li><b>痛点明确</b>：简历海洋、标准不统一、跨系统操作、数据孤岛等问题普遍存在</li>
                <li><b>AI工具丰富</b>：市场上已有大量不同形态的招聘AI工具，样本充足</li>
                <li><b>评价标准可量化</b>：人岗匹配精准度、流程时效、合规性等指标可客观衡量</li>
                <li><b>企业采购意愿强</b>：招聘效率直接影响业务发展，企业愿意为优质工具付费</li>
            </ul>
        </div>

        <div class="method-card">
            <h3><span class="w-1.5 h-4 bg-indigo-500 rounded-full inline-block"></span>整体评测框架</h3>
            <p>采用"先合格，再分专业"的两层评测架构：</p>
            <ul>
                <li><b>第一层（统一合格考）</b>：判断生产力单元是否达到进入候选池的最低门槛</li>
                <li><b>第二层（分专业考）</b>：围绕HR招聘方向，判断"擅长什么、专业度有多深"</li>
            </ul>
            <p style="margin-top:8px">这种设计确保了：不同形态的SKU可以统一建模、允许不同路径评测但结果可比、先过门槛再比专业。</p>
        </div>

        <div class="method-card">
            <h3><span class="w-1.5 h-4 bg-emerald-500 rounded-full inline-block"></span>第一层：统一合格考</h3>
            <p>根据SKU类型采用不同评测路径：</p>
            <div style="margin-top:12px;display:grid;gap:10px">
                <div style="background:#faf9f7;border:1px solid #ebe7df;border-radius:8px;padding:12px">
                    <h4 style="font-size:13px;font-weight:600;color:#3d342a;margin-bottom:4px">完整Agent → GPA三阶段 + Amazon二维</h4>
                    <p style="font-size:12px;color:#6e5f48;line-height:1.6">
                        <b>GPA (Snowflake)</b>: Goal(结果达成) × Plan(规划路径) × Action(执行能力)<br>
                        <b>Amazon二维</b>: 评估目标(响应质量+任务完成) × 评估过程(工具/记忆/推理/恢复/安全/成本)
                    </p>
                </div>
                <div style="background:#faf9f7;border:1px solid #ebe7df;border-radius:8px;padding:12px">
                    <h4 style="font-size:13px;font-weight:600;color:#3d342a;margin-bottom:4px">非Agent → Amazon三层评测</h4>
                    <p style="font-size:12px;color:#6e5f48;line-height:1.6">
                        <b>底层(Model)</b>: 领域正确性/术语理解/长上下文/成本延迟/安全边界<br>
                        <b>中层(Component/Skill)</b>: 意图检测/记忆/规划/工具路由/工作流/工具使用<br>
                        <b>上层(Workflow)</b>: 最终响应/任务完成/目标成功/准确性/安全/成本/体验
                    </p>
                </div>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px">
                    <h4 style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px">一票否决机制</h4>
                    <p style="font-size:12px;color:#b91c1c;line-height:1.6">
                        安全性 &lt; 60分 → 直接FAIL ｜ 任务完成率 &lt; 50分 → 直接FAIL ｜ 工具错误率过高 → 直接FAIL
                    </p>
                </div>
            </div>
        </div>

        <div class="method-card">
            <h3><span class="w-1.5 h-4 bg-purple-500 rounded-full inline-block"></span>第二层：招聘方向六维专业评测</h3>
            <p>基于HR T型能力结构和招聘模块核心工作流设计的六维评测体系：</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
                ${state.dimensions.map((d, i) => `
                    <div style="border:1px solid #ebe7df;border-radius:8px;padding:12px">
                        <h4 style="font-size:12px;font-weight:600;color:#3d342a;margin-bottom:4px">${d.id}. ${d.name}</h4>
                        <p style="font-size:11px;color:#6e5f48;line-height:1.5">${d.definition}</p>
                        <p style="font-size:11px;color:#d97706;margin-top:4px"><b>重要性:</b> ${d.importance}</p>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="method-card">
            <h3><span class="w-1.5 h-4 bg-teal-500 rounded-full inline-block"></span>最终分层逻辑</h3>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px">
                ${['S','A','B','C'].map(t => {
                    const descs = {S:'综合≥82分，4+维度≥80分，可直接采购',A:'综合≥70分，2+维度≥80分，适合组合',B:'综合≥55分，弱项≤2个，需配合使用',C:'其他情况，专业深度不足，不建议独立采购'};
                    return `<div style="text-align:center;border:1px solid #ebe7df;border-radius:10px;padding:16px">
                        <div class="tier-badge tier-${t}" style="margin:0 auto 8px">${t}</div>
                        <h4 style="font-size:13px;font-weight:600;color:#3d342a">${t}层</h4>
                        <p style="font-size:11px;color:#6e5f48;margin-top:4px;line-height:1.5">${descs[t]}</p>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <div class="method-card">
            <h3><span class="w-1.5 h-4 bg-rose-500 rounded-full inline-block"></span>当前POC的局限性</h3>
            <ul>
                <li><b>评测数据为模拟</b>：当前POC中的评分基于SKU特征的规则推算，非真实运行评测</li>
                <li><b>样本覆盖有限</b>：20个样本仅覆盖市场主流产品，未穷尽所有招聘AI工具</li>
                <li><b>运行模式受限</b>：大部分SKU为API Stub或文档模式，未进行真实API调用评测</li>
                <li><b>专业评测任务简化</b>：六维评测的测试任务为设计态，未实际执行完整测试用例</li>
                <li><b>单一垂直场景</b>：仅验证了HR招聘方向，需扩展到法务、客服、销售等场景</li>
                <li><b>缺少真实用户反馈</b>：未纳入Pilot Feedback和企业试用数据</li>
            </ul>
        </div>

        <div class="method-card">
            <h3><span class="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>下一步扩展方向</h3>
            <ul>
                <li>接入真实API，对支持API调用的SKU进行实际运行评测</li>
                <li>设计并执行完整的测试用例集，包含模拟简历、JD、面试反馈等真实数据</li>
                <li>引入企业Pilot Feedback机制，收集真实使用反馈</li>
                <li>扩展到法务、客服、销售、咨询等垂直场景</li>
                <li>建立SKU持续监测机制，定期更新评测结果</li>
                <li>开发SKU组合推荐引擎，为企业提供最优方案组合</li>
            </ul>
        </div>
    `;
}

// ============================================================
// 全局事件委托
// ============================================================
document.addEventListener('click', e => {
    // 详情按钮
    const detailBtn = e.target.closest('.detail-btn');
    if (detailBtn) {
        e.stopPropagation();
        const skuId = detailBtn.dataset.skuId;
        if (skuId) showSKUDetail(skuId);
        return;
    }
    // SKU卡片
    const skuCard = e.target.closest('.sku-card');
    if (skuCard) {
        const skuId = skuCard.dataset.skuId;
        if (skuId) showSKUDetail(skuId);
        return;
    }
    // 表格行
    const tr = e.target.closest('tr[data-sku-id]');
    if (tr && !e.target.closest('button')) {
        const skuId = tr.dataset.skuId;
        if (skuId) showSKUDetail(skuId);
    }
});

// 启动
init();