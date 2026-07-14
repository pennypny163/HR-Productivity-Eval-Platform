/**
 * Digital Productivity Unit Assessment & Selection Platform V2
 * Frontend Application - HR Recruiting Direction
 */

// ============================================================
// Global State
// ============================================================
const state = {
    overview: null,
    tracks: null,
    currentTrack: null,
    currentSku: null,
    compareList: [],
    scenarios: null,
    bundles: null,
    allSkus: null,
    charts: {}
};

const API_BASE = window.DPU_API_BASE || '/api/v2';
let staticSnapshotPromise = null;

const TRACK_NAMES = {
    sourcing_outreach: '候选人寻源与触达',
    interview_assessment: '面试评估与辅助',
    fullcycle_recruiting: '全流程招聘Agent/Platform'
};

const TRACK_ICONS = {
    sourcing_outreach: '🔍',
    interview_assessment: '🎯',
    fullcycle_recruiting: '🔄'
};

const TRACK_COLORS = {
    sourcing_outreach: '#7c3aed',
    interview_assessment: '#0891b2',
    fullcycle_recruiting: '#d97706'
};

const TRACK_DESCRIPTIONS = {
    sourcing_outreach: '帮助招聘团队从外部或内部人才池中发现候选人、做初步匹配，并发起触达。',
    interview_assessment: '帮助企业在面试前、中、后提升结构化评估质量与效率。',
    fullcycle_recruiting: '围绕招聘流程多个环节提供连续能力，覆盖招聘需求到候选人推进的较长链路。'
};

const LEVEL_NAMES = { platform: '平台', agent: 'Agent', workflow: '工作流' };
const LABEL_NAMES = { A: '优先Shortlist', B: '可纳入Shortlist', C: '补充模块观察', D: '不建议纳入' };
const ROLE_NAMES = { core_module: '核心模块', important_module: '重要模块', supplementary_module: '补充模块', observe_only: '观察期' };
const QUAL_NAMES = { pass: '通过', conditional_pass: '条件通过', fail: '未通过' };

// ============================================================
// API Helpers
// ============================================================
async function api(path) {
    try {
        const res = await fetch(API_BASE + path);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return await res.json();
    } catch (apiError) {
        if (!staticSnapshotPromise) {
            staticSnapshotPromise = fetch('data.json').then(res => {
                if (!res.ok) throw new Error(`Static data error: ${res.status}`);
                return res.json();
            });
        }
        const snapshot = await staticSnapshotPromise;
        return resolveStaticApi(snapshot, path, apiError);
    }
}

function resolveStaticApi(snapshot, path, apiError) {
    const [pathname, queryString = ''] = path.split('?');
    const query = new URLSearchParams(queryString);
    if (pathname === '/overview') return snapshot.overview;
    if (pathname === '/tracks') return snapshot.tracks;
    if (pathname.startsWith('/tracks/')) return snapshot.trackDetails[decodeURIComponent(pathname.slice(8))];
    if (pathname === '/skus') {
        return snapshot.skus.filter(item =>
            (!query.get('track') || item.profile.primary_track === query.get('track')) &&
            (!query.get('level') || item.profile.unit_level === query.get('level')) &&
            (!query.get('deployment') || item.profile.deployment_mode === query.get('deployment')) &&
            (!query.get('label') || item.evaluation?.recommendation?.shortlist_label === query.get('label'))
        );
    }
    if (pathname.startsWith('/skus/')) return snapshot.skuDetails[decodeURIComponent(pathname.slice(6))];
    if (pathname === '/compare') {
        const ids = (query.get('ids') || '').split(',').filter(Boolean);
        return ids.map(id => snapshot.skus.find(item => item.profile.id === id)).filter(Boolean);
    }
    if (pathname === '/scenarios') return snapshot.scenarios;
    if (pathname === '/bundles') return snapshot.bundles;
    if (pathname === '/tasks') return query.get('track') ? snapshot.tasks.tracks?.[query.get('track')] || {} : snapshot.tasks;
    if (pathname === '/mock-assets') return snapshot.mockAssets;
    if (pathname === '/methodology') return snapshot.methodology;
    throw apiError;
}

// ============================================================
// Navigation
// ============================================================
function navigateTo(page, params = {}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    // Handle sub-pages that share nav items
    if (page === 'track-detail') {
        document.querySelector('.nav-item[data-page="tracks"]')?.classList.add('active');
    }
    if (page === 'sku-detail') {
        document.querySelector('.nav-item[data-page="tracks"]')?.classList.add('active');
    }

    switch (page) {
        case 'overview': renderOverview(); break;
        case 'tracks': renderTracks(); break;
        case 'track-detail': renderTrackDetail(params.trackKey); break;
        case 'sku-detail': renderSkuDetail(params.skuId); break;
        case 'compare': renderCompare(); break;
        case 'scenarios': renderScenarios(); break;
        case 'bundles': renderBundles(); break;
    }
}

// ============================================================
// Utility Functions
// ============================================================
function scoreClass(score) {
    if (score >= 80) return 'high';
    if (score >= 65) return 'medium';
    return 'low';
}

function labelClass(label) {
    return `label-${label.toLowerCase()}`;
}

function qualClass(status) {
    if (status === 'pass') return 'label-pass';
    if (status === 'conditional_pass') return 'label-conditional';
    return 'label-fail';
}

function levelClass(level) {
    return `label-${level}`;
}

function trackClass(track) {
    if (track === 'sourcing_outreach') return 'track-sourcing';
    if (track === 'interview_assessment') return 'track-interview';
    return 'track-fullcycle';
}

function destroyChart(id) {
    if (state.charts[id]) {
        state.charts[id].destroy();
        delete state.charts[id];
    }
}

// ============================================================
// Page: Overview
// ============================================================
async function renderOverview() {
    const container = document.getElementById('page-overview');
    container.innerHTML = '<div class="loading">加载中</div>';

    try {
        const [overview, tracks, bundles, scenarios] = await Promise.all([
            api('/overview'),
            api('/tracks'),
            api('/bundles'),
            api('/scenarios')
        ]);

        state.overview = overview;
        state.tracks = tracks;

        container.innerHTML = `
            <!-- Hero -->
            <div class="overview-hero">
                <h2>企业招聘数字生产力单元 · 评测与选型工作台</h2>
                <p>本平台帮助企业评估和选择招聘方向的数字生产力工具。不做大一统排行榜，而是按赛道分类评测、按场景推荐、按需求组合采购。</p>
                <div class="hero-tags">
                    <span class="hero-tag">📋 ${overview.total_skus} 个评测对象</span>
                    <span class="hero-tag">🏁 ${overview.total_tracks} 个赛道</span>
                    <span class="hero-tag">📊 两层评测体系</span>
                    <span class="hero-tag">🧩 ${overview.bundle_count} 套组合方案</span>
                </div>
                <div class="overview-flow">
                    <span class="flow-step">① 赛道分类</span>
                    <span class="flow-arrow">→</span>
                    <span class="flow-step">② 资格合格考</span>
                    <span class="flow-arrow">→</span>
                    <span class="flow-step">③ 场景专项考</span>
                    <span class="flow-arrow">→</span>
                    <span class="flow-step">④ 赛道内比较</span>
                    <span class="flow-arrow">→</span>
                    <span class="flow-step">⑤ 组合推荐</span>
                </div>
            </div>

            <!-- Stats -->
            <div class="grid-4" style="margin-bottom:24px">
                <div class="card stat-card">
                    <div class="stat-value">${overview.total_skus}</div>
                    <div class="stat-label">评测对象总数</div>
                </div>
                <div class="card stat-card">
                    <div class="stat-value" style="color:var(--success)">${overview.qualification_stats.pass}</div>
                    <div class="stat-label">资格通过</div>
                </div>
                <div class="card stat-card">
                    <div class="stat-value" style="color:var(--warning)">${overview.qualification_stats.conditional_pass}</div>
                    <div class="stat-label">条件通过</div>
                </div>
                <div class="card stat-card">
                    <div class="stat-value" style="color:var(--danger)">${overview.qualification_stats.fail || 0}</div>
                    <div class="stat-label">未通过</div>
                </div>
            </div>

            <!-- Track Distribution -->
            <div class="grid-3" style="margin-bottom:24px">
                ${tracks.map(t => `
                    <div class="card track-card ${trackClass(t.track_key)}" onclick="navigateTo('track-detail', {trackKey:'${t.track_key}'})">
                        <div class="track-header">
                            <span class="track-name">${TRACK_ICONS[t.track_key]} ${t.track_name}</span>
                            <span class="track-count">${t.sku_count} SKU</span>
                        </div>
                        <div class="track-desc">${TRACK_DESCRIPTIONS[t.track_key]}</div>
                        <div class="track-dims">
                            ${t.dimensions.map(d => `<span class="tag">${d.name}</span>`).join('')}
                        </div>
                        <div class="track-labels">
                            ${Object.entries(t.label_distribution).map(([k,v]) => v > 0 ? `<span class="label ${labelClass(k)}">${k}: ${v}</span>` : '').join('')}
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Shortlist Distribution & Track Scores -->
            <div class="grid-2" style="margin-bottom:24px">
                <div class="card">
                    <div class="card-title"><span class="icon">📊</span> Shortlist 标签分布</div>
                    <div class="chart-container"><canvas id="chart-labels"></canvas></div>
                </div>
                <div class="card">
                    <div class="card-title"><span class="icon">📈</span> 各赛道平均专项分</div>
                    <div class="chart-container"><canvas id="chart-track-scores"></canvas></div>
                </div>
            </div>

            <!-- Bundle Preview -->
            <div class="card" style="margin-bottom:24px">
                <div class="card-title"><span class="icon">🧩</span> 推荐组合方案预览</div>
                <div class="grid-3">
                    ${bundles.map(b => `
                        <div class="card" style="cursor:pointer" onclick="navigateTo('bundles')">
                            <div style="font-weight:700;font-size:14px;margin-bottom:4px">${b.bundle_name}</div>
                            <div style="font-size:12px;color:var(--gray-500);margin-bottom:8px">${b.target_problem}</div>
                            <div style="display:flex;flex-wrap:wrap;gap:4px">
                                ${b.components.map(c => `<span class="tag tag-primary">${c.sku_name}</span>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Key Risks -->
            ${overview.top_risks.length > 0 ? `
            <div class="card">
                <div class="card-title"><span class="icon">⚠️</span> 主要风险分布</div>
                ${overview.top_risks.map(r => `
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
                        <span>${r.risk}</span>
                        <span class="label label-c">${r.count} SKU</span>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        `;

        // Render charts
        renderLabelChart(overview.label_stats);
        renderTrackScoreChart(overview.track_avg_scores);

    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>加载失败: ${err.message}</p></div>`;
    }
}

function renderLabelChart(labelStats) {
    destroyChart('chart-labels');
    const ctx = document.getElementById('chart-labels');
    if (!ctx) return;
    state.charts['chart-labels'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['A: 优先Shortlist', 'B: 可纳入Shortlist', 'C: 补充模块观察', 'D: 不建议纳入'],
            datasets: [{
                data: [labelStats.A || 0, labelStats.B || 0, labelStats.C || 0, labelStats.D || 0],
                backgroundColor: ['#16a34a', '#2563eb', '#d97706', '#dc2626'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } }
            }
        }
    });
}

function renderTrackScoreChart(trackScores) {
    destroyChart('chart-track-scores');
    const ctx = document.getElementById('chart-track-scores');
    if (!ctx) return;
    const labels = Object.keys(trackScores).map(k => TRACK_NAMES[k] || k);
    const data = Object.values(trackScores);
    const colors = Object.keys(trackScores).map(k => TRACK_COLORS[k] || '#6b7280');

    state.charts['chart-track-scores'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: '平均专项分',
                data,
                backgroundColor: colors.map(c => c + '33'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ============================================================
// Page: Tracks
// ============================================================
async function renderTracks() {
    const container = document.getElementById('page-tracks');
    container.innerHTML = '<div class="loading">加载中</div>';

    try {
        const tracks = state.tracks || await api('/tracks');
        state.tracks = tracks;

        container.innerHTML = `
            <h2 class="page-title">赛道选择</h2>
            <p class="page-subtitle">请选择一个赛道进入，查看该赛道内的评测对象和评测结果。不同赛道使用不同的专项评测维度。</p>

            <div class="info-box">
                <strong>💡 为什么按赛道分类？</strong> 不同赛道的产品解决不同的招聘问题，使用不同的评测维度。将它们放在同一个榜单中比较是不合理的。V2 改为"同赛道内比较 + 跨赛道组合推荐"。
            </div>

            <div class="grid-3">
                ${tracks.map(t => `
                    <div class="card track-card ${trackClass(t.track_key)}" onclick="navigateTo('track-detail', {trackKey:'${t.track_key}'})">
                        <div class="track-header">
                            <span class="track-name">${TRACK_ICONS[t.track_key]} ${t.track_name}</span>
                            <span class="track-count">${t.sku_count} SKU</span>
                        </div>
                        <div class="track-desc">${TRACK_DESCRIPTIONS[t.track_key]}</div>

                        <div style="margin-bottom:12px">
                            <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:6px">评测维度</div>
                            <div class="track-dims">
                                ${t.dimensions.map(d => `<span class="tag">${d.name} (${(d.weight*100).toFixed(0)}%)</span>`).join('')}
                            </div>
                        </div>

                        <div style="margin-bottom:12px">
                            <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:6px">纳入的SKU</div>
                            ${t.skus.map(s => `
                                <div style="font-size:12px;padding:2px 0">
                                    <span class="label ${levelClass(s.level)}" style="margin-right:4px">${LEVEL_NAMES[s.level]}</span>
                                    ${s.name}
                                </div>
                            `).join('')}
                        </div>

                        <div class="track-labels">
                            ${Object.entries(t.label_distribution).map(([k,v]) => `<span class="label ${labelClass(k)}">${k}: ${v}</span>`).join('')}
                        </div>

                        <div style="margin-top:12px">
                            <button class="btn btn-primary btn-sm" style="width:100%">进入赛道 →</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>加载失败: ${err.message}</p></div>`;
    }
}

// ============================================================
// Page: Track Detail
// ============================================================
async function renderTrackDetail(trackKey) {
    const container = document.getElementById('page-track-detail');
    container.innerHTML = '<div class="loading">加载中</div>';
    state.currentTrack = trackKey;

    try {
        const data = await api(`/tracks/${trackKey}`);

        container.innerHTML = `
            <div class="breadcrumb">
                <a href="#" onclick="navigateTo('tracks');return false">赛道</a>
                <span class="sep">/</span>
                <span>${data.track_name}</span>
            </div>

            <h2 class="page-title">${TRACK_ICONS[trackKey]} ${data.track_name}</h2>
            <p class="page-subtitle">${TRACK_DESCRIPTIONS[trackKey]}</p>

            <!-- Track Info -->
            <div class="grid-2" style="margin-bottom:24px">
                <div class="card">
                    <div class="card-title"><span class="icon">📐</span> 评测维度与权重</div>
                    ${data.dimensions.map(d => `
                        <div class="dimension-bar">
                            <div class="dim-header">
                                <span class="dim-name">${d.name}</span>
                                <span class="dim-score">${(d.weight*100).toFixed(0)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill high" style="width:${d.weight*100*2.5}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="card">
                    <div class="card-title"><span class="icon">🚧</span> 硬门槛 (Hard Gates)</div>
                    ${data.hard_gates.map(g => `
                        <div style="padding:8px 0;border-bottom:1px solid var(--border)">
                            <div style="font-weight:600;font-size:13px">${g.gate_name}</div>
                            <div style="font-size:12px;color:var(--gray-500)">${g.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Filter -->
            <div class="filter-bar">
                <select id="filter-level" onchange="filterTrackSkus('${trackKey}')">
                    <option value="">全部层级</option>
                    <option value="platform">平台 Platform</option>
                    <option value="agent">Agent</option>
                    <option value="workflow">工作流 Workflow</option>
                </select>
                <select id="filter-label" onchange="filterTrackSkus('${trackKey}')">
                    <option value="">全部标签</option>
                    <option value="A">A: 优先Shortlist</option>
                    <option value="B">B: 可纳入Shortlist</option>
                    <option value="C">C: 补充模块观察</option>
                    <option value="D">D: 不建议纳入</option>
                </select>
                <button class="btn btn-outline btn-sm" onclick="addAllToCompare('${trackKey}')">📊 全部加入对比</button>
            </div>

            <!-- Scatter Plot -->
            <div class="card" style="margin-bottom:24px">
                <div class="card-title"><span class="icon">📈</span> 资格分 vs 专项分 矩阵</div>
                <div class="scatter-container"><canvas id="chart-scatter-${trackKey}"></canvas></div>
            </div>

            <!-- SKU List -->
            <div id="track-sku-list" class="grid-2">
                ${data.skus.map(item => renderSkuCard(item)).join('')}
            </div>
        `;

        // Render scatter chart
        renderScatterChart(trackKey, data.skus);

        // Store data for filtering
        state.trackSkus = data.skus;

    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>加载失败: ${err.message}</p></div>`;
    }
}

function renderSkuCard(item) {
    const p = item.profile;
    const e = item.evaluation || {};
    const q = e.qualification || {};
    const s = e.scenario_assessment || {};
    const r = e.recommendation || {};

    const isInCompare = state.compareList.includes(p.id);

    return `
        <div class="card sku-card" data-level="${p.unit_level}" data-label="${r.shortlist_label || 'D'}">
            <input type="checkbox" class="compare-checkbox" ${isInCompare ? 'checked' : ''}
                   onchange="toggleCompare('${p.id}', this.checked)" title="加入对比">
            <div class="sku-header">
                <div>
                    <div class="sku-name">${p.product_name}</div>
                    <div class="sku-vendor">${p.vendor_name}</div>
                </div>
                <span class="label ${labelClass(r.shortlist_label || 'D')}">${r.shortlist_label || 'D'}: ${LABEL_NAMES[r.shortlist_label] || '未评测'}</span>
            </div>
            <div class="sku-desc">${p.short_description}</div>
            <div class="sku-meta">
                <span class="label ${levelClass(p.unit_level)}">${LEVEL_NAMES[p.unit_level]}</span>
                <span class="label ${qualClass(q.status || 'fail')}">${QUAL_NAMES[q.status] || '未评测'}</span>
                <span class="tag">${p.deployment_mode}</span>
                <span class="tag">集成: ${p.integration_level}</span>
            </div>
            <div class="sku-scores">
                <div>
                    <div style="font-size:11px;color:var(--gray-500)">资格分</div>
                    <div class="score-display">
                        <span class="score-value score-${scoreClass(q.total_score || 0)}" style="font-size:18px">${q.total_score || '-'}</span>
                        <span class="score-max">/100</span>
                    </div>
                </div>
                <div>
                    <div style="font-size:11px;color:var(--gray-500)">专项分</div>
                    <div class="score-display">
                        <span class="score-value score-${scoreClass(s.total_score || 0)}" style="font-size:18px">${s.total_score || '-'}</span>
                        <span class="score-max">/100</span>
                    </div>
                </div>
                <div>
                    <div style="font-size:11px;color:var(--gray-500)">采购角色</div>
                    <div style="font-size:12px;font-weight:600">${ROLE_NAMES[r.purchase_role] || '-'}</div>
                </div>
            </div>
            <div class="sku-actions">
                <button class="btn btn-primary btn-sm" onclick="navigateTo('sku-detail', {skuId:'${p.id}'})">查看详情</button>
                <button class="btn btn-outline btn-sm" onclick="toggleCompare('${p.id}', true)">加入对比</button>
            </div>
        </div>
    `;
}

function filterTrackSkus(trackKey) {
    const level = document.getElementById('filter-level')?.value || '';
    const label = document.getElementById('filter-label')?.value || '';

    const cards = document.querySelectorAll('#track-sku-list .sku-card');
    cards.forEach(card => {
        const cardLevel = card.dataset.level;
        const cardLabel = card.dataset.label;
        let show = true;
        if (level && cardLevel !== level) show = false;
        if (label && cardLabel !== label) show = false;
        card.parentElement.style.display = show ? '' : 'none';
    });
}

function renderScatterChart(trackKey, skus) {
    const chartId = `chart-scatter-${trackKey}`;
    destroyChart(chartId);
    const ctx = document.getElementById(chartId);
    if (!ctx) return;

    const points = skus.map(item => {
        const p = item.profile;
        const e = item.evaluation || {};
        const q = e.qualification || {};
        const s = e.scenario_assessment || {};
        const r = e.recommendation || {};
        const label = r.shortlist_label || 'D';
        const colorMap = { A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#dc2626' };
        return {
            x: q.total_score || 0,
            y: s.total_score || 0,
            label: p.product_name,
            backgroundColor: colorMap[label],
            borderColor: colorMap[label],
            pointRadius: 8
        };
    });

    state.charts[chartId] = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                data: points.map(p => ({ x: p.x, y: p.y })),
                backgroundColor: points.map(p => p.backgroundColor),
                borderColor: points.map(p => p.borderColor),
                pointRadius: points.map(p => p.pointRadius),
                pointHoverRadius: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: '第一层资格分', font: { size: 12 } },
                    min: 50, max: 100,
                    grid: { color: '#f3f4f6' }
                },
                y: {
                    title: { display: true, text: '第二层专项分', font: { size: 12 } },
                    min: 50, max: 100,
                    grid: { color: '#f3f4f6' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const idx = context.dataIndex;
                            return `${points[idx].label}: 资格${points[idx].x}, 专项${points[idx].y}`;
                        }
                    }
                }
            }
        }
    });
}

function addAllToCompare(trackKey) {
    if (!state.trackSkus) return;
    state.trackSkus.forEach(item => {
        const id = item.profile.id;
        if (!state.compareList.includes(id)) {
            state.compareList.push(id);
        }
    });
    // Update checkboxes
    document.querySelectorAll('.compare-checkbox').forEach(cb => cb.checked = true);
    alert(`已将${state.trackSkus.length}个SKU加入对比列表`);
}

// ============================================================
// Page: SKU Detail
// ============================================================
async function renderSkuDetail(skuId) {
    const container = document.getElementById('page-sku-detail');
    container.innerHTML = '<div class="loading">加载中</div>';

    try {
        const data = await api(`/skus/${skuId}`);
        const p = data.profile;
        const e = data.evaluation || {};
        const q = e.qualification || {};
        const s = e.scenario_assessment || {};
        const r = e.recommendation || {};
        const tasks = data.task_evidence || [];
        const trackInfo = data.track_info || {};

        state.currentSku = data;

        container.innerHTML = `
            <div class="breadcrumb">
                <a href="#" onclick="navigateTo('tracks');return false">赛道</a>
                <span class="sep">/</span>
                <a href="#" onclick="navigateTo('track-detail', {trackKey:'${p.primary_track}'});return false">${TRACK_NAMES[p.primary_track]}</a>
                <span class="sep">/</span>
                <span>${p.product_name}</span>
            </div>

            <!-- Header -->
            <div class="detail-header">
                <div>
                    <div class="detail-title">${p.product_name}</div>
                    <div class="detail-vendor">${p.vendor_name} · <a href="${p.official_url}" target="_blank" style="color:var(--primary)">${p.official_url}</a></div>
                    <div class="detail-badges">
                        <span class="label ${labelClass(r.shortlist_label || 'D')}">${r.shortlist_label}: ${LABEL_NAMES[r.shortlist_label] || '-'}</span>
                        <span class="label ${levelClass(p.unit_level)}">${LEVEL_NAMES[p.unit_level]}</span>
                        <span class="label ${qualClass(q.status || 'fail')}">${QUAL_NAMES[q.status] || '-'}</span>
                        <span class="tag">${ROLE_NAMES[r.purchase_role] || '-'}</span>
                    </div>
                </div>
                <div style="text-align:right">
                    <div class="score-display" style="justify-content:flex-end">
                        <span class="score-value score-${scoreClass(s.total_score || 0)}">${s.total_score || '-'}</span>
                        <span class="score-max">/100 专项分</span>
                    </div>
                    <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="toggleCompare('${p.id}', true);navigateTo('compare')">加入对比</button>
                </div>
            </div>

            <!-- Basic Info -->
            <div class="detail-section">
                <div class="detail-section-title">📋 基本信息</div>
                <div class="grid-2">
                    <div class="card">
                        <p style="font-size:14px;line-height:1.7;margin-bottom:12px">${p.short_description}</p>
                        <p style="font-size:13px;color:var(--gray-600);line-height:1.6"><strong>核心价值：</strong>${p.core_value}</p>
                        <div style="margin-top:12px">
                            <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:4px">覆盖环节</div>
                            <div>${p.supported_stages.map(s => `<span class="tag">${s}</span>`).join('')}</div>
                        </div>
                        <div style="margin-top:8px">
                            <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:4px">目标客户</div>
                            <div>${p.target_customer.map(c => `<span class="tag">${c}</span>`).join('')}</div>
                        </div>
                    </div>
                    <div class="card">
                        <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:8px">采购约束信息</div>
                        <table class="data-table">
                            <tr><td style="font-weight:600;width:40%">部署方式</td><td>${p.deployment_mode}</td></tr>
                            <tr><td style="font-weight:600">定价模式</td><td>${p.pricing_model}</td></tr>
                            <tr><td style="font-weight:600">集成成熟度</td><td>${p.integration_level}</td></tr>
                            <tr><td style="font-weight:600">集成目标</td><td>${p.integration_targets.join(', ')}</td></tr>
                            <tr><td style="font-weight:600">语言支持</td><td>${p.language_support.join(', ')}</td></tr>
                            <tr><td style="font-weight:600">区域支持</td><td>${p.region_support.join(', ')}</td></tr>
                            <tr><td style="font-weight:600">私有化部署</td><td>${p.compliance_flags.supports_private_deployment ? '✅ 支持' : '❌ 不支持'}</td></tr>
                            <tr><td style="font-weight:600">PII处理</td><td>${p.compliance_flags.pii_handling}</td></tr>
                            <tr><td style="font-weight:600">跨境风险</td><td>${p.compliance_flags.cross_border_risk}</td></tr>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Qualification -->
            <div class="detail-section">
                <div class="detail-section-title">🚧 第一层：资格合格考</div>
                <div class="grid-2">
                    <div class="card">
                        <div class="card-title">Hard Gates 硬门槛</div>
                        ${(q.hard_gate_results || []).map(g => `
                            <div class="gate-item ${g.passed ? 'passed' : 'failed'}">
                                <span class="gate-icon">${g.passed ? '✅' : '❌'}</span>
                                <div class="gate-content">
                                    <div class="gate-name">${g.gate_name}</div>
                                    <div class="gate-reason">${g.reason}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="card">
                        <div class="card-title">基础评分</div>
                        <div style="text-align:center;margin-bottom:16px">
                            <div class="score-display" style="justify-content:center">
                                <span class="score-value score-${scoreClass(q.total_score || 0)}">${q.total_score || '-'}</span>
                                <span class="score-max">/100</span>
                            </div>
                            <div style="font-size:12px;color:var(--gray-500)">资格总分</div>
                        </div>
                        ${Object.entries(q.base_scores || {}).map(([k,v]) => {
                            const names = {operability:'基础可运行性', integration_readiness:'集成成熟度', enterprise_safety:'企业安全与治理', task_closure:'基础任务闭环'};
                            return `
                                <div class="dimension-bar">
                                    <div class="dim-header">
                                        <span class="dim-name">${names[k] || k}</span>
                                        <span class="dim-score score-${scoreClass(v)}">${v}</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill ${scoreClass(v)}" style="width:${v}%"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${q.key_risks && q.key_risks.length > 0 ? `
                            <div style="margin-top:12px">
                                <div style="font-size:12px;font-weight:600;color:var(--danger);margin-bottom:4px">⚠️ 关键风险</div>
                                ${q.key_risks.map(r => `<div style="font-size:12px;color:var(--gray-600);padding:2px 0">• ${r}</div>`).join('')}
                            </div>
                        ` : ''}
                        <div style="margin-top:12px;font-size:13px;color:var(--gray-600);line-height:1.6">${q.summary || ''}</div>
                    </div>
                </div>
            </div>

            <!-- Scenario Assessment -->
            <div class="detail-section">
                <div class="detail-section-title">🎯 第二层：场景专项考（${TRACK_NAMES[s.track] || '-'}）</div>
                <div class="grid-2">
                    <div class="card">
                        <div class="card-title">各维度评分</div>
                        <div style="text-align:center;margin-bottom:16px">
                            <div class="score-display" style="justify-content:center">
                                <span class="score-value score-${scoreClass(s.total_score || 0)}">${s.total_score || '-'}</span>
                                <span class="score-max">/100</span>
                            </div>
                            <div style="font-size:12px;color:var(--gray-500)">专项总分 · 适配度: ${s.fit_level || '-'}</div>
                        </div>
                        ${(s.dimensions || []).map(d => `
                            <div class="dimension-bar">
                                <div class="dim-header">
                                    <span class="dim-name">${d.dimension_name}</span>
                                    <span class="dim-score score-${scoreClass(d.score)}">${d.score}</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill ${scoreClass(d.score)}" style="width:${d.score}%"></div>
                                </div>
                                <div class="dim-comment">${d.comment}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="card">
                        <div class="card-title">评估总结</div>
                        <div style="margin-bottom:16px">
                            <h4 style="font-size:13px;font-weight:600;color:var(--success);margin-bottom:6px">✅ 优势</h4>
                            <ul class="sw-list strengths">
                                ${(s.strengths || []).map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="margin-bottom:16px">
                            <h4 style="font-size:13px;font-weight:600;color:var(--warning);margin-bottom:6px">⚠️ 劣势</h4>
                            <ul class="sw-list weaknesses">
                                ${(s.weaknesses || []).map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="margin-bottom:16px">
                            <h4 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px">👍 适合场景</h4>
                            <ul class="sw-list suitable">
                                ${(s.suitable_for || []).map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                        <div>
                            <h4 style="font-size:13px;font-weight:600;color:var(--danger);margin-bottom:6px">👎 不适合场景</h4>
                            <ul class="sw-list not-suitable">
                                ${(s.not_suitable_for || []).map(n => `<li>${n}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Task Evidence -->
            ${tasks.length > 0 ? `
            <div class="detail-section">
                <div class="detail-section-title">🧪 测试任务证据</div>
                <div class="info-box">
                    <strong>说明：</strong>以下测试任务结果基于Mock模拟执行。在正式评测中，这些任务将使用真实数据和API调用来获取评测证据。
                </div>
                <div class="grid-3">
                    ${tasks.map(t => `
                        <div class="card task-evidence-card">
                            <div class="task-name">${t.task_id}: ${t.task_name}</div>
                            <div class="task-desc">${t.description}</div>
                            <div class="task-score score-${scoreClass(t.result.score)}">${t.result.score}/100</div>
                            <div class="task-summary">${t.result.summary}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Recommendation -->
            <div class="detail-section">
                <div class="detail-section-title">📋 采购建议</div>
                <div class="card">
                    <div style="display:flex;gap:16px;align-items:center;margin-bottom:16px">
                        <span class="label ${labelClass(r.shortlist_label || 'D')}" style="font-size:16px;padding:6px 16px">${r.shortlist_label}: ${LABEL_NAMES[r.shortlist_label] || '-'}</span>
                        <span class="tag tag-primary" style="font-size:13px;padding:4px 12px">${ROLE_NAMES[r.purchase_role] || '-'}</span>
                    </div>
                    <p style="font-size:14px;line-height:1.7;margin-bottom:12px">${r.recommendation_summary || ''}</p>
                    ${r.recommended_bundle_roles ? `
                        <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:4px">推荐组合角色</div>
                        <div>${r.recommended_bundle_roles.map(role => `<span class="tag tag-primary">${role}</span>`).join('')}</div>
                    ` : ''}
                </div>
            </div>
        `;

    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>加载失败: ${err.message}</p></div>`;
    }
}

// ============================================================
// Page: Compare
// ============================================================
async function renderCompare() {
    const container = document.getElementById('page-compare');

    if (state.compareList.length < 2) {
        // Show SKU selector
        try {
            const allSkus = state.allSkus || await api('/skus');
            state.allSkus = allSkus;

            container.innerHTML = `
                <h2 class="page-title">SKU 横向对比</h2>
                <p class="page-subtitle">选择 2-4 个 SKU 进行横向对比。建议选择同赛道内的产品进行对比。</p>

                <div class="compare-selector card">
                    <div class="card-title">已选择 (${state.compareList.length}/4)</div>
                    <div class="selected-skus" id="selected-skus">
                        ${state.compareList.map(id => {
                            const sku = allSkus.find(s => s.profile.id === id);
                            return sku ? `
                                <span class="compare-chip">
                                    ${sku.profile.product_name}
                                    <span class="remove-btn" onclick="toggleCompare('${id}', false);renderCompare()">×</span>
                                </span>
                            ` : '';
                        }).join('')}
                        ${state.compareList.length < 4 ? '<span style="font-size:12px;color:var(--gray-400)">请从下方选择更多SKU</span>' : ''}
                    </div>
                    ${state.compareList.length >= 2 ? `
                        <button class="btn btn-primary" style="margin-top:12px" onclick="executeCompare()">开始对比</button>
                    ` : ''}
                </div>

                <div class="grid-3" style="margin-top:16px">
                    ${allSkus.map(item => {
                        const p = item.profile;
                        const r = item.evaluation?.recommendation || {};
                        const isSelected = state.compareList.includes(p.id);
                        return `
                            <div class="card" style="cursor:pointer;${isSelected ? 'border-color:var(--primary);background:var(--primary-light)' : ''}"
                                 onclick="toggleCompare('${p.id}', ${!isSelected});renderCompare()">
                                <div style="display:flex;justify-content:space-between;align-items:center">
                                    <div>
                                        <div style="font-weight:600;font-size:14px">${p.product_name}</div>
                                        <div style="font-size:12px;color:var(--gray-500)">${p.vendor_name}</div>
                                    </div>
                                    <div style="display:flex;gap:4px">
                                        <span class="label ${labelClass(r.shortlist_label || 'D')}">${r.shortlist_label || '-'}</span>
                                        <span class="label ${levelClass(p.unit_level)}">${LEVEL_NAMES[p.unit_level]}</span>
                                    </div>
                                </div>
                                <div style="font-size:11px;color:var(--gray-400);margin-top:4px">${TRACK_NAMES[p.primary_track]}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>加载失败: ${err.message}</p></div>`;
        }
        return;
    }

    await executeCompare();
}

async function executeCompare() {
    const container = document.getElementById('page-compare');
    container.innerHTML = '<div class="loading">加载中</div>';

    try {
        const ids = state.compareList.join(',');
        const data = await api(`/compare?ids=${ids}`);

        const rows = [
            { group: '基本定位', items: [
                { label: '产品名称', key: p => p.profile.product_name },
                { label: '厂商', key: p => p.profile.vendor_name },
                { label: '单元层级', key: p => `<span class="label ${levelClass(p.profile.unit_level)}">${LEVEL_NAMES[p.profile.unit_level]}</span>` },
                { label: '主赛道', key: p => TRACK_NAMES[p.profile.primary_track] },
                { label: '部署方式', key: p => p.profile.deployment_mode },
                { label: '定价模式', key: p => p.profile.pricing_model },
                { label: '集成成熟度', key: p => p.profile.integration_level },
            ]},
            { group: '资格评测', items: [
                { label: '资格状态', key: p => `<span class="label ${qualClass(p.evaluation?.qualification?.status)}">${QUAL_NAMES[p.evaluation?.qualification?.status] || '-'}</span>` },
                { label: '资格总分', key: p => {
                    const s = p.evaluation?.qualification?.total_score;
                    return s ? `<span class="score-value score-${scoreClass(s)}" style="font-size:16px">${s}</span>` : '-';
                }},
                { label: '可运行性', key: p => p.evaluation?.qualification?.base_scores?.operability || '-' },
                { label: '集成成熟度', key: p => p.evaluation?.qualification?.base_scores?.integration_readiness || '-' },
                { label: '企业安全', key: p => p.evaluation?.qualification?.base_scores?.enterprise_safety || '-' },
                { label: '任务闭环', key: p => p.evaluation?.qualification?.base_scores?.task_closure || '-' },
            ]},
            { group: '专项评测', items: [
                { label: '专项总分', key: p => {
                    const s = p.evaluation?.scenario_assessment?.total_score;
                    return s ? `<span class="score-value score-${scoreClass(s)}" style="font-size:16px">${s}</span>` : '-';
                }},
                { label: '适配度', key: p => p.evaluation?.scenario_assessment?.fit_level || '-' },
                ...(() => {
                    // Get all unique dimensions
                    const dims = new Set();
                    data.forEach(d => {
                        (d.evaluation?.scenario_assessment?.dimensions || []).forEach(dim => dims.add(dim.dimension_name));
                    });
                    return Array.from(dims).map(dimName => ({
                        label: dimName,
                        key: p => {
                            const dim = (p.evaluation?.scenario_assessment?.dimensions || []).find(d => d.dimension_name === dimName);
                            return dim ? `<span class="score-${scoreClass(dim.score)}">${dim.score}</span>` : '-';
                        }
                    }));
                })()
            ]},
            { group: '采购建议', items: [
                { label: 'Shortlist标签', key: p => {
                    const l = p.evaluation?.recommendation?.shortlist_label;
                    return l ? `<span class="label ${labelClass(l)}">${l}: ${LABEL_NAMES[l]}</span>` : '-';
                }},
                { label: '采购角色', key: p => ROLE_NAMES[p.evaluation?.recommendation?.purchase_role] || '-' },
                { label: '优势', key: p => (p.evaluation?.scenario_assessment?.strengths || []).map(s => `<div style="font-size:11px">✅ ${s}</div>`).join('') || '-' },
                { label: '劣势', key: p => (p.evaluation?.scenario_assessment?.weaknesses || []).map(w => `<div style="font-size:11px">⚠️ ${w}</div>`).join('') || '-' },
                { label: '适合场景', key: p => (p.evaluation?.scenario_assessment?.suitable_for || []).map(s => `<span class="tag" style="font-size:10px">${s}</span>`).join('') || '-' },
            ]}
        ];

        container.innerHTML = `
            <h2 class="page-title">SKU 横向对比</h2>
            <p class="page-subtitle">对比 ${data.length} 个评测对象的详细信息和评测结果</p>

            <div class="compare-selector" style="margin-bottom:16px">
                <div class="selected-skus">
                    ${data.map(d => `
                        <span class="compare-chip">
                            ${d.profile.product_name}
                            <span class="remove-btn" onclick="toggleCompare('${d.profile.id}', false);renderCompare()">×</span>
                        </span>
                    `).join('')}
                    <button class="btn btn-outline btn-sm" onclick="state.compareList=[];renderCompare()">清空</button>
                </div>
            </div>

            <!-- Radar Chart -->
            <div class="card" style="margin-bottom:24px">
                <div class="card-title"><span class="icon">📊</span> 维度对比雷达图</div>
                <div class="chart-container" style="max-height:350px"><canvas id="chart-compare-radar"></canvas></div>
            </div>

            <!-- Comparison Table -->
            <div class="card compare-table-wrapper">
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th>对比维度</th>
                            ${data.map(d => `<th>${d.profile.product_name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(group => `
                            <tr class="row-group-header"><td colspan="${data.length + 1}">${group.group}</td></tr>
                            ${group.items.map(item => `
                                <tr>
                                    <td>${item.label}</td>
                                    ${data.map(d => `<td>${item.key(d)}</td>`).join('')}
                                </tr>
                            `).join('')}
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Render radar chart
        renderCompareRadar(data);

    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>加载失败: ${err.message}</p></div>`;
    }
}

function renderCompareRadar(data) {
    destroyChart('chart-compare-radar');
    const ctx = document.getElementById('chart-compare-radar');
    if (!ctx) return;

    // Collect all dimension names
    const dimNames = new Set();
    data.forEach(d => {
        (d.evaluation?.scenario_assessment?.dimensions || []).forEach(dim => dimNames.add(dim.dimension_name));
    });
    // Also add base scores
    const allLabels = ['可运行性', '集成成熟度', '企业安全', '任务闭环', ...Array.from(dimNames)];

    const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626'];

    const datasets = data.map((d, i) => {
        const bs = d.evaluation?.qualification?.base_scores || {};
        const dims = d.evaluation?.scenario_assessment?.dimensions || [];
        const values = [
            bs.operability || 0,
            bs.integration_readiness || 0,
            bs.enterprise_safety || 0,
            bs.task_closure || 0,
            ...Array.from(dimNames).map(name => {
                const dim = dims.find(dd => dd.dimension_name === name);
                return dim ? dim.score : 0;
            })
        ];
        return {
            label: d.profile.product_name,
            data: values,
            borderColor: colors[i],
            backgroundColor: colors[i] + '22',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: colors[i]
        };
    });

    state.charts['chart-compare-radar'] = new Chart(ctx, {
        type: 'radar',
        data: { labels: allLabels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { stepSize: 20, font: { size: 10 } },
                    pointLabels: { font: { size: 11 } },
                    grid: { color: '#e5e7eb' }
                }
            },
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } }
            }
        }
    });
}

// ============================================================
// Page: Scenarios
// ============================================================
async function renderScenarios() {
    const container = document.getElementById('page-scenarios');
    container.innerHTML = '<div class="loading">加载中</div>';

    try {
        const scenarios = await api('/scenarios');
        state.scenarios = scenarios;

        container.innerHTML = `
            <h2 class="page-title">场景化推荐</h2>
            <p class="page-subtitle">从企业实际招聘问题出发，推荐适合的产品和组合方案。</p>

            <div class="info-box">
                <strong>💡 为什么从场景出发？</strong> 企业采购数字生产力工具的出发点是解决具体问题，而不是追求"最高分产品"。场景化推荐帮助企业找到最适合自己问题的解决方案。
            </div>

            ${scenarios.map((s, i) => `
                <div class="card scenario-card" style="border-left-color:${['#7c3aed','#0891b2','#d97706'][i]}">
                    <div class="scenario-name">场景 ${String.fromCharCode(65+i)}：${s.scenario_name}</div>
                    <div class="scenario-problem">${s.problem_description}</div>

                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:6px">建议关注赛道</div>
                        <div>${s.recommended_tracks.map(t => `<span class="tag tag-primary">${TRACK_NAMES[t]}</span>`).join('')}</div>
                    </div>

                    <div class="recommended-skus">
                        <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:8px">推荐产品</div>
                        ${s.recommended_skus.map((sku, j) => `
                            <div class="recommended-sku-item" style="cursor:pointer" onclick="navigateTo('sku-detail', {skuId:'${sku.sku_id}'})">
                                <div class="sku-rank">${j+1}</div>
                                <div class="sku-info">
                                    <div class="sku-name">${sku.sku_name}</div>
                                    <div class="sku-reason">${sku.reason}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top:16px;padding:12px;background:var(--gray-50);border-radius:var(--radius)">
                        <div style="font-size:12px;font-weight:600;color:var(--gray-700);margin-bottom:4px">💡 实施建议</div>
                        <div style="font-size:13px;color:var(--gray-600);line-height:1.6">${s.implementation_suggestion}</div>
                    </div>
                </div>
            `).join('')}
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>加载失败: ${err.message}</p></div>`;
    }
}

// ============================================================
// Page: Bundles
// ============================================================
async function renderBundles() {
    const container = document.getElementById('page-bundles');
    container.innerHTML = '<div class="loading">加载中</div>';

    try {
        const bundles = await api('/bundles');
        state.bundles = bundles;

        container.innerHTML = `
            <h2 class="page-title">组合推荐方案</h2>
            <p class="page-subtitle">不是买一个冠军，而是买一套组合。跨赛道的产品通过组合实现互补。</p>

            <div class="info-box">
                <strong>💡 为什么做组合推荐？</strong> 单一产品很难覆盖招聘全链路。不同赛道的产品各有专长，通过合理组合可以实现1+1>2的效果。组合方案帮助企业避免"买了最贵的但用不好"的困境。
            </div>

            ${bundles.map((b, i) => `
                <div class="card bundle-card" style="border-top-color:${['#2563eb','#0891b2','#d97706'][i]}">
                    <div class="bundle-name">${b.bundle_name}</div>
                    <div class="bundle-target">🎯 ${b.target_problem}</div>

                    <div style="margin-bottom:8px">
                        <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:6px">适用企业</div>
                        <div>${b.suitable_for.map(s => `<span class="tag">${s}</span>`).join('')}</div>
                    </div>

                    <div style="margin-bottom:16px">
                        <div style="font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:8px">组合成员</div>
                        ${b.components.map(c => `
                            <div class="bundle-component" style="cursor:pointer" onclick="navigateTo('sku-detail', {skuId:'${c.sku_id}'})">
                                <span class="comp-role">${c.role}</span>
                                <div>
                                    <div class="comp-name">${c.sku_name}</div>
                                    <div class="comp-desc">${c.responsibility}</div>
                                </div>
                                <span class="label ${c.priority === 'core' ? 'label-a' : c.priority === 'important' ? 'label-b' : 'label-c'}">${c.priority}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div class="grid-2">
                        <div class="bundle-section advantages">
                            <h4>✅ 组合优势</h4>
                            <ul>${b.bundle_advantages.map(a => `<li>${a}</li>`).join('')}</ul>
                        </div>
                        <div class="bundle-section risks">
                            <h4>⚠️ 风险提示</h4>
                            <ul>${b.risk_notes.map(r => `<li>${r}</li>`).join('')}</ul>
                        </div>
                    </div>

                    <div class="roi-badge" style="margin-top:16px">
                        📈 ${b.estimated_roi}
                    </div>
                </div>
            `).join('')}
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>加载失败: ${err.message}</p></div>`;
    }
}

// ============================================================
// Compare List Management
// ============================================================
function toggleCompare(skuId, add) {
    if (add) {
        if (!state.compareList.includes(skuId) && state.compareList.length < 4) {
            state.compareList.push(skuId);
        }
    } else {
        state.compareList = state.compareList.filter(id => id !== skuId);
    }
    // Update any visible checkboxes
    document.querySelectorAll('.compare-checkbox').forEach(cb => {
        const card = cb.closest('.sku-card');
        if (card) {
            // Find the SKU ID from the card's onclick
            const detailBtn = card.querySelector('.btn-primary');
            if (detailBtn) {
                const match = detailBtn.getAttribute('onclick')?.match(/skuId:'([^']+)'/);
                if (match) {
                    cb.checked = state.compareList.includes(match[1]);
                }
            }
        }
    });
}

// ============================================================
// Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) navigateTo(page);
        });
    });

    // Load initial page
    navigateTo('overview');
});
