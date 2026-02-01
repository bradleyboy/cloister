// Cloister - Client-side JavaScript

const state = {
  sessions: [],
  projects: [],
  tags: {},
  currentSession: null,
  filters: {
    time: 'all',
    tag: null,
    project: null,
    search: ''
  },
  eventSource: null,
  messageLoader: null,
  focusedSessionIndex: -1
};

// MessageLoader - Handles lazy loading of message content using IntersectionObserver
class MessageLoader {
  constructor(container, messages, toolResults) {
    this.container = container;
    this.messages = messages;
    this.toolResults = toolResults;
    this.loadedSet = new Set();

    // Create observer with rootMargin to load content slightly before it's visible
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        root: container,
        rootMargin: '200px 0px', // Load 200px before entering viewport
        threshold: 0
      }
    );
  }

  handleIntersection(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target;
        const index = parseInt(element.dataset.messageIndex, 10);

        if (!this.loadedSet.has(index)) {
          this.loadMessage(element, index);
          this.loadedSet.add(index);
        }

        // Unobserve after loading
        this.observer.unobserve(element);
      }
    }
  }

  loadMessage(element, index) {
    const message = this.messages[index];
    if (!message) return;

    // Replace skeleton with actual content
    const contentDiv = element.querySelector('.message-content');
    if (!contentDiv) return;

    // Use requestAnimationFrame to defer rendering and avoid blocking main thread
    requestAnimationFrame(() => {
      const contentHtml = renderMessageContent(message.content, this.toolResults);

      // Guardrail: hide message entirely if rendered content is empty
      if (!contentHtml.trim()) {
        element.style.display = 'none';
        return;
      }

      contentDiv.innerHTML = contentHtml;

      // Remove skeleton class
      element.classList.remove('message-skeleton');

      // Setup event listeners for tool cards and thinking blocks
      this.setupEventListeners(element);

      // Defer syntax highlighting to next frame to avoid blocking
      requestAnimationFrame(() => {
        applyHighlighting(element);
      });
    });
  }

  setupEventListeners(element) {
    // Tool card toggles
    element.querySelectorAll('.tool-header').forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const toolCard = header.parentElement;
        toolCard.classList.toggle('collapsed');

        // Handle deferred tool result rendering
        if (toolCard.classList.contains('deferred') && !toolCard.classList.contains('collapsed')) {
          this.loadDeferredToolContent(toolCard);
        }
      });
    });

    // Thinking block toggles
    element.querySelectorAll('.thinking-block').forEach(block => {
      block.addEventListener('click', () => {
        block.classList.toggle('expanded');
      });
    });
  }

  loadDeferredToolContent(toolCard) {
    const rawContent = toolCard.dataset.rawContent;
    if (!rawContent) return;

    const toolBody = toolCard.querySelector('.tool-body');
    if (!toolBody) return;

    // Parse and render the deferred content
    try {
      const content = JSON.parse(rawContent);
      toolBody.innerHTML = renderDeferredToolBody(content);
      toolCard.classList.remove('deferred');
      toolCard.classList.add('expanded');

      // Apply highlighting if needed
      requestAnimationFrame(() => {
        applyHighlighting(toolBody);
      });
    } catch (e) {
      console.error('Failed to load deferred tool content:', e);
    }
  }

  observe(element) {
    this.observer.observe(element);
  }

  disconnect() {
    this.observer.disconnect();
    this.loadedSet.clear();
  }

  // Force load messages that are currently visible (for initial render)
  forceLoadVisible() {
    const containerRect = this.container.getBoundingClientRect();
    const elements = this.container.querySelectorAll('.message-skeleton');

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      // Check if element is in the visible portion of the container
      if (rect.top < containerRect.bottom + 200 && rect.bottom > containerRect.top - 200) {
        const index = parseInt(element.dataset.messageIndex, 10);
        if (!this.loadedSet.has(index)) {
          this.loadMessage(element, index);
          this.loadedSet.add(index);
          this.observer.unobserve(element);
        }
      }
    }
  }
}

// Render deferred tool body content (for collapsed tool results)
function renderDeferredToolBody(content) {
  if (typeof content === 'string') {
    // Check if it looks like code
    if (content.includes('\n') && (content.includes('function') || content.includes('const ') || content.includes('import '))) {
      return renderCodeBlock(content);
    }
    return `<div class="bash-output">${escapeHtml(content)}</div>`;
  }
  return `<pre>${escapeHtml(JSON.stringify(content, null, 2))}</pre>`;
}

// Initialize the app
async function init() {
  await loadSessions();
  await loadProjects();
  await loadTags();
  setupEventListeners();
  setupRouting();
  requestNotificationPermission();

  // Handle initial URL path (for permalinks)
  await handleRoute();
}

// Fetch sessions from API
async function loadSessions() {
  try {
    const response = await fetch('/api/sessions');
    const data = await response.json();
    state.sessions = data.sessions;
    renderSessionList();
    updateFilterCounts();
  } catch (error) {
    console.error('Failed to load sessions:', error);
    document.getElementById('session-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#x26A0;</div>
        <div class="empty-state-title">Failed to load sessions</div>
        <div class="empty-state-text">${error.message}</div>
      </div>
    `;
  }
}

// Fetch projects from API
async function loadProjects() {
  try {
    const response = await fetch('/api/projects');
    const data = await response.json();
    state.projects = data.projects;
    renderProjectList();
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

// Fetch tags from API
async function loadTags() {
  try {
    const response = await fetch('/api/tags');
    const data = await response.json();
    state.tags = data.tags;
    renderTagList();
  } catch (error) {
    console.error('Failed to load tags:', error);
  }
}

// Render the session list
function renderSessionList() {
  const container = document.getElementById('session-list');
  const filtered = getFilteredSessions();

  // Reset keyboard focus when list is re-rendered
  state.focusedSessionIndex = -1;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#x1F4AC;</div>
        <div class="empty-state-title">No sessions found</div>
        <div class="empty-state-text">Try adjusting your filters or start a new Claude Code session.</div>
      </div>
    `;
    return;
  }

  // Group sessions by chainId
  const chains = new Map();
  const standalone = [];

  for (const session of filtered) {
    if (session.chainId && session.chainLength > 1) {
      if (!chains.has(session.chainId)) {
        chains.set(session.chainId, []);
      }
      chains.get(session.chainId).push(session);
    } else {
      standalone.push(session);
    }
  }

  // Sort chain sessions by chainIndex
  for (const [chainId, sessions] of chains) {
    sessions.sort((a, b) => a.chainIndex - b.chainIndex);
  }

  // Build the HTML - interleave chains and standalone based on most recent
  const items = [];

  // Add all items with their sort timestamp
  for (const session of standalone) {
    items.push({
      type: 'standalone',
      session,
      sortTime: new Date(session.lastModified).getTime()
    });
  }

  for (const [chainId, sessions] of chains) {
    items.push({
      type: 'chain',
      sessions,
      sortTime: new Date(sessions[0].lastModified).getTime()
    });
  }

  // Sort by most recent first
  items.sort((a, b) => b.sortTime - a.sortTime);

  // Render
  container.innerHTML = items.map(item => {
    if (item.type === 'standalone') {
      return renderSessionCard(item.session);
    } else {
      return renderSessionChain(item.sessions);
    }
  }).join('');

  // Setup chain toggle handlers
  container.querySelectorAll('.chain-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle.closest('.session-chain').classList.toggle('collapsed');
    });
  });
}

// Render a single session card
function renderSessionCard(session, isChainMember = false) {
  const chainBadge = session.chainLength > 1 && session.chainIndex === 0
    ? `<span class="chain-badge">&#x1F517; ${session.chainLength} sessions</span>`
    : '';

  return `
    <div class="session-card ${session.status === 'awaiting' ? 'awaiting' : ''} ${isChainMember ? 'chain-head' : ''}"
         data-id="${session.id}" onclick="showSession('${session.id}')">
      <div class="session-title">${escapeHtml(session.title)}${chainBadge}</div>
      <div class="session-meta">
        <span class="session-project">${escapeHtml(session.projectName)}</span>
        <span class="session-dot"></span>
        <span>${formatRelativeTime(session.lastModified)}</span>
        ${renderStatusIndicator(session.status)}
      </div>
      <div class="session-tags">
        ${session.tags.map(tag => `<span class="tag tag-${tag}">${tag}</span>`).join('')}
      </div>
    </div>
  `;
}

// Render a session chain (related sessions grouped together)
function renderSessionChain(sessions) {
  const head = sessions[0];
  const older = sessions.slice(1);
  const isAwaiting = head.status === 'awaiting';

  return `
    <div class="session-chain collapsed ${isAwaiting ? 'awaiting' : ''}" data-chain-id="${head.chainId}">
      ${renderSessionCard(head, true)}
      <div class="chain-toggle">
        <span class="chain-toggle-icon">&#x25BC;</span>
        <span>${older.length} older session${older.length > 1 ? 's' : ''} with same title</span>
      </div>
      <div class="chain-older">
        ${older.map(session => `
          <div class="session-card" data-id="${session.id}" onclick="showSession('${session.id}')">
            <div class="session-title">${escapeHtml(session.title)}</div>
            <div class="session-meta">
              <span>${formatRelativeTime(session.lastModified)}</span>
              <span class="session-dot"></span>
              <span>${session.messageCount} messages</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Render status indicator
function renderStatusIndicator(status) {
  if (status === 'idle') return '';

  const labels = {
    awaiting: 'Needs input',
    working: 'Working...'
  };

  return `
    <span class="session-dot"></span>
    <span class="live-indicator ${status}">
      <span class="live-dot"></span>
      ${labels[status]}
    </span>
  `;
}

// Render project list
function renderProjectList() {
  const container = document.getElementById('project-list');
  container.innerHTML = state.projects.map(project => `
    <div class="project-item ${state.filters.project === project.path ? 'active' : ''}"
         data-project="${project.path}" onclick="filterByProject('${escapeHtml(project.path)}')">
      <span class="project-icon">&#x1F4C1;</span>
      <span class="project-name">${escapeHtml(project.name)}</span>
      <span class="filter-count">${project.count}</span>
    </div>
  `).join('');
}

// Render tag list
function renderTagList() {
  const container = document.getElementById('tag-list');
  container.innerHTML = Object.entries(state.tags)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => `
      <span class="tag tag-${tag} ${state.filters.tag === tag ? 'active' : ''}"
            onclick="filterByTag('${tag}')">${tag} (${count})</span>
    `).join('');
}

// Get filtered sessions
function getFilteredSessions() {
  return state.sessions.filter(session => {
    // Time filter
    if (state.filters.time !== 'all') {
      const sessionDate = new Date(session.lastModified);
      const now = new Date();

      if (state.filters.time === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (sessionDate < today) return false;
      } else if (state.filters.time === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (sessionDate < weekAgo) return false;
      }
    }

    // Tag filter
    if (state.filters.tag && !session.tags.includes(state.filters.tag)) {
      return false;
    }

    // Project filter
    if (state.filters.project && session.project !== state.filters.project) {
      return false;
    }

    // Search filter
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      const matchesTitle = session.title.toLowerCase().includes(search);
      const matchesProject = session.projectName.toLowerCase().includes(search);
      const matchesTags = session.tags.some(t => t.toLowerCase().includes(search));
      if (!matchesTitle && !matchesProject && !matchesTags) return false;
    }

    return true;
  });
}

// Update filter counts
function updateFilterCounts() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  document.getElementById('count-all').textContent = state.sessions.length;
  document.getElementById('count-today').textContent = state.sessions.filter(s =>
    new Date(s.lastModified) >= today
  ).length;
  document.getElementById('count-week').textContent = state.sessions.filter(s =>
    new Date(s.lastModified) >= weekAgo
  ).length;
}

// Filter functions
function filterByTime(filter) {
  state.filters.time = filter;

  document.querySelectorAll('#time-filters .filter-item').forEach(el => {
    el.classList.toggle('active', el.dataset.filter === filter);
  });

  // Return to list view if on detail page (without reloading data)
  if (state.currentSession) {
    returnToListView();
  }
  renderSessionList();
}

function filterByTag(tag) {
  state.filters.tag = state.filters.tag === tag ? null : tag;
  renderTagList();

  // Return to list view if on detail page (without reloading data)
  if (state.currentSession) {
    returnToListView();
  }
  renderSessionList();
}

function filterByProject(project) {
  state.filters.project = state.filters.project === project ? null : project;
  renderProjectList();

  // Return to list view if on detail page (without reloading data)
  if (state.currentSession) {
    returnToListView();
  }
  renderSessionList();
}

// Return to list view without reloading data
function returnToListView() {
  // Clear session from URL
  clearSessionUrl();

  // Stop SSE
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }

  // Cleanup message loader
  if (state.messageLoader) {
    state.messageLoader.disconnect();
    state.messageLoader = null;
  }

  state.currentSession = null;
  document.title = 'Cloister';

  // Switch views
  document.getElementById('list-view').classList.remove('hidden');
  document.getElementById('detail-view').classList.remove('active');

  // Reset scroll position to top of list view
  document.getElementById('list-view').scrollTop = 0;
}

// Show session detail
async function showSession(sessionId) {
  // Update URL for permalink support
  updateUrlForSession(sessionId);

  // Use the common navigation function
  await navigateToSession(sessionId);
}

// Render session detail
function renderSessionDetail(session, isInitialLoad = false) {
  document.getElementById('detail-title').textContent = session.title;

  const metaHtml = `
    <span>${session.projectName}</span>
    <span>&#x2022;</span>
    <span>${formatDate(session.timestamp)}</span>
    <span>&#x2022;</span>
    <span>${session.messages.length} messages</span>
    ${session.status !== 'idle' ? `
      <span>&#x2022;</span>
      <span class="live-indicator ${session.status}">
        <span class="live-dot"></span>
        ${session.status === 'awaiting' ? 'Awaiting your input' : 'Working...'}
      </span>
    ` : ''}
  `;
  document.getElementById('detail-meta').innerHTML = metaHtml;

  // Clear the old banner area (no longer used for layout-shifting banners)
  const bannerContainer = document.getElementById('detail-banner');
  bannerContainer.innerHTML = '';

  // Only re-render messages on initial load to avoid performance issues
  // Status updates don't need to re-render messages
  if (isInitialLoad) {
    renderMessages(session.messages);
    // Force scroll to bottom for initial load
    scrollToBottom();
  }

  // Update floating indicator visibility
  updateStatusIndicator();
}

// Check if message has meaningful content to display
function hasDisplayableContent(content) {
  if (!Array.isArray(content)) {
    return content && String(content).trim().length > 0;
  }

  return content.some(block => {
    if (block.type === 'text') {
      // Check if text has actual content after cleaning
      const text = block.text || '';
      return text.trim().length > 0;
    }
    if (block.type === 'tool_use') {
      // Tool use is meaningful
      return true;
    }
    if (block.type === 'tool_result') {
      // Tool results are integrated into their corresponding tool_use cards,
      // so renderToolResult() always returns ''. Never treat these as displayable.
      return false;
    }
    if (block.type === 'thinking') {
      return block.thinking && block.thinking.trim().length > 0;
    }
    return false;
  });
}

// Check if user is scrolled to near the bottom of container
function isNearBottom(container, threshold = 100) {
  return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
}

// Render messages with lazy loading (used for initial load only)
function renderMessages(messages) {
  const container = document.getElementById('messages');

  // Disconnect previous loader if exists
  if (state.messageLoader) {
    state.messageLoader.disconnect();
    state.messageLoader = null;
  }

  // Build a map of tool_use IDs to their tool_results (for question answers)
  const toolResults = new Map();
  messages.forEach(msg => {
    if (Array.isArray(msg.content)) {
      msg.content.forEach(block => {
        if (block.type === 'tool_result' && block.tool_use_id) {
          toolResults.set(block.tool_use_id, block);
        }
      });
    }
  });

  // Filter messages with displayable content and track original indices
  const displayableMessages = [];
  messages.forEach((message, originalIndex) => {
    if (hasDisplayableContent(message.content)) {
      displayableMessages.push({ message, originalIndex });
    }
  });

  // For small message counts, use direct rendering (no lazy loading overhead)
  const LAZY_LOAD_THRESHOLD = 20;

  if (displayableMessages.length <= LAZY_LOAD_THRESHOLD) {
    // Direct rendering for small message counts
    const renderedMessages = displayableMessages
      .map(({ message }) => {
        const isUser = message.type === 'user';
        const label = isUser ? 'You' : 'Claude';
        const contentHtml = renderMessageContent(message.content, toolResults);

        if (!contentHtml.trim()) return '';

        return `
          <div class="message message-${message.type}">
            <div class="message-label">${label}</div>
            <div class="message-content">
              ${contentHtml}
            </div>
          </div>
        `;
      })
      .filter(html => html.trim().length > 0);

    container.innerHTML = renderedMessages.join('');

    // Setup event listeners directly
    setupMessageEventListeners(container);

    // Apply syntax highlighting
    applyHighlighting(container);
    return;
  }

  // Lazy loading for larger message counts
  // Render lightweight shells with skeleton placeholders
  const shells = displayableMessages.map(({ message, originalIndex }, displayIndex) => {
    const isUser = message.type === 'user';
    const label = isUser ? 'You' : 'Claude';

    // Generate skeleton with varying line widths for visual variety
    const lineCount = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
    const skeletonLines = Array(lineCount).fill(0).map((_, i) => {
      const widthClass = ['skeleton-short', 'skeleton-medium', 'skeleton-long'][i % 3];
      return `<div class="skeleton-line ${widthClass}"></div>`;
    }).join('');

    return `
      <div class="message message-${message.type} message-skeleton"
           data-message-index="${originalIndex}">
        <div class="message-label">${label}</div>
        <div class="message-content">
          <div class="skeleton-lines">
            ${skeletonLines}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = shells;

  // Create message loader with IntersectionObserver
  state.messageLoader = new MessageLoader(container, messages, toolResults);

  // Observe all message shells
  container.querySelectorAll('.message-skeleton').forEach(element => {
    state.messageLoader.observe(element);
  });

  // Force-load messages currently visible (at bottom of scroll)
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    if (state.messageLoader) {
      state.messageLoader.forceLoadVisible();
    }
  });
}

// Setup event listeners for message content (tool cards, thinking blocks)
function setupMessageEventListeners(container) {
  // Tool card toggles
  container.querySelectorAll('.tool-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const toolCard = header.parentElement;
      toolCard.classList.toggle('collapsed');

      // Handle deferred tool result rendering
      if (toolCard.classList.contains('deferred') && !toolCard.classList.contains('collapsed')) {
        loadDeferredToolContent(toolCard);
      }
    });
  });

  // Thinking block toggles
  container.querySelectorAll('.thinking-block').forEach(block => {
    block.addEventListener('click', () => {
      block.classList.toggle('expanded');
    });
  });
}

// Load deferred tool content when expanded
function loadDeferredToolContent(toolCard) {
  const rawContent = toolCard.dataset.rawContent;
  if (!rawContent) return;

  const toolBody = toolCard.querySelector('.tool-body');
  if (!toolBody) return;

  try {
    const content = JSON.parse(rawContent);
    toolBody.innerHTML = renderDeferredToolBody(content);
    toolCard.classList.remove('deferred');
    toolCard.classList.add('expanded');

    requestAnimationFrame(() => {
      applyHighlighting(toolBody);
    });
  } catch (e) {
    console.error('Failed to load deferred tool content:', e);
  }
}

// Render message content blocks
function renderMessageContent(content, toolResults = new Map()) {
  if (!Array.isArray(content)) {
    return `<div class="message-text">${escapeHtml(String(content))}</div>`;
  }

  return content.map(block => {
    switch (block.type) {
      case 'text':
        // Skip empty text blocks
        if (!block.text || !block.text.trim()) return '';
        return `<div class="message-text">${formatText(block.text)}</div>`;

      case 'thinking':
        if (!block.thinking || !block.thinking.trim()) return '';
        return `
          <div class="thinking-block">
            <div class="thinking-header">
              <span class="thinking-icon">&#x1F4AD;</span>
              <span>View thinking</span>
            </div>
            <div class="thinking-content">${escapeHtml(block.thinking)}</div>
          </div>
        `;

      case 'tool_use':
        return renderToolUse(block, toolResults);

      case 'tool_result':
        return renderToolResult(block);

      default:
        return '';
    }
  }).join('');
}

// Render tool use block
function renderToolUse(block, toolResults = new Map()) {
  const toolName = block.name || 'Unknown';
  const toolClass = `tool-${toolName.toLowerCase()}`;
  const icon = getToolIcon(toolName);

  let path = '';
  let content = '';
  let summary = '';
  let hasSpecializedContent = false;

  if (block.input) {
    if (block.input.file_path) {
      path = block.input.file_path;
    } else if (block.input.command) {
      path = block.input.command;
    } else if (block.input.pattern) {
      path = block.input.pattern;
    }

    if (toolName === 'Edit' && block.input.old_string && block.input.new_string) {
      content = renderDiff(block.input.old_string, block.input.new_string);
      hasSpecializedContent = true;
    } else if (toolName === 'Write' && block.input.content) {
      content = renderCodeBlock(block.input.content, getFileLanguage(block.input.file_path || ''));
      hasSpecializedContent = true;
    } else if (toolName === 'TodoWrite' || toolName === 'TaskCreate' || toolName === 'TaskUpdate') {
      content = renderTodoContent(block.input);
      hasSpecializedContent = true;
    } else if (toolName === 'TaskList' || toolName === 'TaskGet') {
      content = renderTaskListContent(block, toolResults);
      hasSpecializedContent = true;
    } else if (toolName === 'Task') {
      content = renderTaskAgentContent(block.input);
      summary = block.input.description || '';
      hasSpecializedContent = true;
    } else if (toolName === 'Grep' || toolName === 'Glob') {
      content = renderSearchContent(block.input);
      hasSpecializedContent = true;
    } else if (toolName === 'Bash' && block.input.command) {
      content = renderBashCommand(block.input);
      hasSpecializedContent = true;
    } else if (toolName === 'Read') {
      summary = block.input.file_path ? `Reading ${block.input.file_path.split('/').pop()}` : '';
    }
  }

  // For AskUserQuestion, show the question with selected answer
  if (toolName === 'AskUserQuestion' && block.input?.questions) {
    // Find the tool result to get the user's answer
    const result = toolResults.get(block.id);
    let selectedAnswers = null;
    if (result && result.content) {
      try {
        // The result content might contain the answers JSON
        const resultContent = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
        // Try to extract answers from the result
        selectedAnswers = parseQuestionAnswers(resultContent, block.input.questions);
      } catch (e) {
        // Ignore parsing errors
      }
    }
    return renderQuestionCard(block.input.questions, selectedAnswers);
  }

  // Get tool result for this tool call
  const toolResult = toolResults.get(block.id);

  // For tools without specialized content, render a generic detail view
  if (!hasSpecializedContent) {
    content = renderToolDetailView(block.input, toolResult);
  } else if (toolResult && toolResult.content) {
    // Append tool result to specialized content
    const resultContent = renderToolResultContent(toolResult.content);
    if (resultContent) {
      content += resultContent;
    }
  }

  // Use summary if available, otherwise use path
  const displayPath = summary || path;

  // All tool cards should now be expandable since we always have content
  return `
    <div class="tool-card ${toolClass} collapsed">
      <div class="tool-header">
        <div class="tool-icon">${icon}</div>
        <span class="tool-name">${toolName}</span>
        <span class="tool-path">${escapeHtml(displayPath)}</span>
        <span class="tool-toggle">&#x25BC;</span>
      </div>
      <div class="tool-body">${content}</div>
    </div>
  `;
}

// Render a generic detail view for tool input and output
function renderToolDetailView(input, toolResult) {
  let html = '<div class="tool-detail-view">';

  // Render input section if there's input
  if (input && Object.keys(input).length > 0) {
    html += '<div class="tool-section">';
    html += '<div class="tool-section-header">Input</div>';
    html += '<div class="tool-section-content">';
    html += renderToolInputParams(input);
    html += '</div></div>';
  }

  // Render output section if there's a result
  if (toolResult && toolResult.content) {
    const resultHtml = renderToolResultContent(toolResult.content);
    if (resultHtml) {
      html += resultHtml;
    }
  }

  html += '</div>';
  return html;
}

// Render tool input parameters in a readable format
function renderToolInputParams(input) {
  let html = '<div class="tool-params">';

  for (const [key, value] of Object.entries(input)) {
    // Skip very long content values that would clutter the view
    const displayValue = formatParamValue(key, value);
    html += `
      <div class="tool-param">
        <span class="tool-param-key">${escapeHtml(key)}:</span>
        <span class="tool-param-value">${displayValue}</span>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

// Format a parameter value for display
function formatParamValue(key, value) {
  if (value === null || value === undefined) {
    return '<span class="tool-param-null">null</span>';
  }

  if (typeof value === 'boolean') {
    return `<span class="tool-param-bool">${value}</span>`;
  }

  if (typeof value === 'number') {
    return `<span class="tool-param-number">${value}</span>`;
  }

  if (typeof value === 'string') {
    // For long strings, truncate and show in a code-like format
    if (value.length > 200) {
      const truncated = value.slice(0, 200) + '...';
      return `<code class="tool-param-string">${escapeHtml(truncated)}</code>`;
    }
    // For multiline strings, show in a pre block
    if (value.includes('\n')) {
      return `<pre class="tool-param-multiline">${escapeHtml(value)}</pre>`;
    }
    return `<code class="tool-param-string">${escapeHtml(value)}</code>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '<span class="tool-param-array">[]</span>';
    }
    // For small arrays, show inline
    if (value.length <= 3 && value.every(v => typeof v === 'string' || typeof v === 'number')) {
      return `<span class="tool-param-array">[${value.map(v => escapeHtml(String(v))).join(', ')}]</span>`;
    }
    // For larger arrays, show as JSON
    return `<pre class="tool-param-json">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
  }

  if (typeof value === 'object') {
    return `<pre class="tool-param-json">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
  }

  return escapeHtml(String(value));
}

// Render tool result content
function renderToolResultContent(content) {
  if (!content) return '';

  let html = '<div class="tool-section tool-output">';
  html += '<div class="tool-section-header">Output</div>';
  html += '<div class="tool-section-content">';

  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed) {
      html += '<span class="tool-result-empty">(empty)</span>';
    } else if (trimmed.length > 1000) {
      // For very long output, truncate
      html += `<pre class="tool-result-text">${escapeHtml(trimmed.slice(0, 1000))}...\n\n[${trimmed.length - 1000} more characters]</pre>`;
    } else {
      html += `<pre class="tool-result-text">${escapeHtml(trimmed)}</pre>`;
    }
  } else if (Array.isArray(content)) {
    // Handle array content (like nested content blocks)
    const textParts = content
      .filter(c => c.type === 'text' && c.text)
      .map(c => c.text)
      .join('\n');
    if (textParts) {
      html += `<pre class="tool-result-text">${escapeHtml(textParts)}</pre>`;
    } else {
      html += `<pre class="tool-result-json">${escapeHtml(JSON.stringify(content, null, 2))}</pre>`;
    }
  } else {
    html += `<pre class="tool-result-json">${escapeHtml(JSON.stringify(content, null, 2))}</pre>`;
  }

  html += '</div></div>';
  return html;
}

// Render todo/task content
function renderTodoContent(input) {
  if (input.todos && Array.isArray(input.todos)) {
    return `
      <div class="todo-list">
        ${input.todos.map((todo, i) => `
          <div class="todo-item ${todo.status === 'completed' ? 'completed' : ''}">
            <span class="todo-checkbox">${todo.status === 'completed' ? '&#x2705;' : todo.status === 'in_progress' ? '&#x23F3;' : '&#x2B1C;'}</span>
            <div class="todo-content">
              <div class="todo-subject">${escapeHtml(todo.subject || todo.content || '')}</div>
              ${todo.description ? `<div class="todo-description">${escapeHtml(todo.description)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Single task
  if (input.subject || input.description) {
    return `
      <div class="todo-list">
        <div class="todo-item">
          <span class="todo-checkbox">&#x2B1C;</span>
          <div class="todo-content">
            <div class="todo-subject">${escapeHtml(input.subject || '')}</div>
            ${input.description ? `<div class="todo-description">${escapeHtml(input.description)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  return `<div class="tool-detail"><pre>${escapeHtml(JSON.stringify(input, null, 2))}</pre></div>`;
}

// Render TaskList/TaskGet content (shows the result if available)
function renderTaskListContent(block, toolResults) {
  const result = toolResults.get(block.id);
  if (!result || !result.content) {
    return '<div class="tool-detail"><em>Loading tasks...</em></div>';
  }

  let content = result.content;
  if (typeof content === 'string') {
    // Try to parse as JSON
    try {
      // Check if it looks like task list output
      if (content.includes('#') && (content.includes('[pending]') || content.includes('[completed]') || content.includes('[in_progress]'))) {
        // Parse the text format
        const lines = content.split('\n').filter(l => l.trim());
        const tasks = [];

        for (const line of lines) {
          const match = line.match(/^#(\d+)\.\s*\[(\w+)\]\s*(.+)$/);
          if (match) {
            tasks.push({
              id: match[1],
              status: match[2],
              subject: match[3]
            });
          }
        }

        if (tasks.length > 0) {
          return `
            <div class="todo-list">
              ${tasks.map(task => `
                <div class="todo-item ${task.status === 'completed' ? 'completed' : ''}">
                  <span class="todo-checkbox">${task.status === 'completed' ? '&#x2705;' : task.status === 'in_progress' ? '&#x23F3;' : '&#x2B1C;'}</span>
                  <div class="todo-content">
                    <div class="todo-subject"><span class="task-id">#${task.id}</span> ${escapeHtml(task.subject)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
      // Fallback to showing raw content
      return `<div class="tool-detail"><pre>${escapeHtml(content)}</pre></div>`;
    } catch (e) {
      return `<div class="tool-detail"><pre>${escapeHtml(content)}</pre></div>`;
    }
  }

  return `<div class="tool-detail"><pre>${escapeHtml(JSON.stringify(content, null, 2))}</pre></div>`;
}

// Render Task agent content
function renderTaskAgentContent(input) {
  let html = '<div class="task-agent-content">';

  if (input.subagent_type) {
    html += `<div class="task-agent-type"><strong>Agent:</strong> ${escapeHtml(input.subagent_type)}</div>`;
  }

  if (input.description) {
    html += `<div class="task-agent-desc"><strong>Task:</strong> ${escapeHtml(input.description)}</div>`;
  }

  if (input.prompt) {
    const shortPrompt = input.prompt.length > 300 ? input.prompt.slice(0, 300) + '...' : input.prompt;
    html += `<div class="task-agent-prompt">${escapeHtml(shortPrompt)}</div>`;
  }

  html += '</div>';
  return html;
}

// Render search content (Grep/Glob)
function renderSearchContent(input) {
  let html = '<div class="search-content">';

  if (input.pattern) {
    html += `<div class="search-pattern"><strong>Pattern:</strong> <code>${escapeHtml(input.pattern)}</code></div>`;
  }

  if (input.path) {
    html += `<div class="search-path"><strong>Path:</strong> ${escapeHtml(input.path)}</div>`;
  }

  if (input.glob) {
    html += `<div class="search-glob"><strong>Glob:</strong> ${escapeHtml(input.glob)}</div>`;
  }

  html += '</div>';
  return html;
}

// Render bash command content
function renderBashCommand(input) {
  let html = '<div class="bash-content">';
  html += `<div class="bash-command"><code>${escapeHtml(input.command)}</code></div>`;
  if (input.description) {
    html += `<div class="bash-desc">${escapeHtml(input.description)}</div>`;
  }
  html += '</div>';
  return html;
}

// Render tool result - now returns empty as results are shown within tool_use cards
function renderToolResult(block) {
  // Tool results are now integrated into their corresponding tool_use blocks
  // via the toolResults map passed to renderToolUse, so we don't render
  // separate cards for tool results anymore
  return '';
}

// Parse question answers from tool result
function parseQuestionAnswers(resultContent, questions) {
  // The answer format varies - it could be JSON with answers object,
  // or just the selected option text
  const answers = {};

  // Try to find selected answers in the result
  questions.forEach((q, qIndex) => {
    q.options.forEach((opt, optIndex) => {
      // Check if this option's label appears in the result
      if (resultContent.includes(opt.label)) {
        answers[qIndex] = optIndex;
      }
    });
  });

  return Object.keys(answers).length > 0 ? answers : null;
}

// Render question card
function renderQuestionCard(questions, selectedAnswers = null) {
  return questions.map((q, qIndex) => `
    <div class="question-card">
      <div class="question-header">
        <span class="question-icon">&#x2753;</span>
        <span class="question-title">${selectedAnswers ? 'Claude asked' : 'Claude is asking'}</span>
      </div>
      <div class="question-body">
        <p class="question-text">${escapeHtml(q.question)}</p>
        <div class="question-options">
          ${q.options.map((opt, optIndex) => {
            const isSelected = selectedAnswers && selectedAnswers[qIndex] === optIndex;
            return `
              <div class="question-option ${isSelected ? 'selected' : ''}">
                <span class="option-label">${escapeHtml(opt.label)}</span>
                <span class="option-desc">${escapeHtml(opt.description || '')}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

// Render diff view
function renderDiff(oldStr, newStr) {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');

  let html = '<div class="code-block">';

  // Simple diff: show removed then added
  oldLines.forEach((line, i) => {
    html += `
      <div class="code-line diff-remove">
        <span class="line-number">${i + 1}</span>
        <span class="line-content">${escapeHtml(line)}</span>
      </div>
    `;
  });

  newLines.forEach((line, i) => {
    html += `
      <div class="code-line diff-add">
        <span class="line-number">${i + 1}</span>
        <span class="line-content">${escapeHtml(line)}</span>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

// Render code block with syntax highlighting
function renderCodeBlock(code, language = '') {
  // Try to apply syntax highlighting to the whole block first
  let highlightedCode = escapeHtml(code);

  if (typeof hljs !== 'undefined') {
    try {
      if (language && hljs.getLanguage(language)) {
        highlightedCode = hljs.highlight(code, { language }).value;
      } else {
        // Auto-detect language
        const result = hljs.highlightAuto(code);
        highlightedCode = result.value;
      }
    } catch (e) {
      // Fallback to escaped HTML
      highlightedCode = escapeHtml(code);
    }
  }

  // Split into lines while preserving HTML tags
  const lines = highlightedCode.split('\n');

  let html = '<div class="code-block hljs">';
  lines.forEach((line, i) => {
    html += `
      <div class="code-line">
        <span class="line-number">${i + 1}</span>
        <span class="line-content">${line || ' '}</span>
      </div>
    `;
  });
  html += '</div>';

  return html;
}

// Get tool icon
function getToolIcon(toolName) {
  const icons = {
    'Read': '&#x1F4C4;',
    'Edit': '&#x270F;',
    'Write': '&#x1F4DD;',
    'Bash': '$',
    'Glob': '&#x1F50D;',
    'Grep': '&#x1F50E;',
    'Task': '&#x1F916;',
    'AskUserQuestion': '&#x2753;',
    'TodoWrite': '&#x2705;',
    'TaskCreate': '&#x2795;',
    'TaskUpdate': '&#x1F504;',
    'TaskList': '&#x1F4CB;',
    'WebFetch': '&#x1F310;',
    'WebSearch': '&#x1F50D;'
  };
  return icons[toolName] || '&#x1F527;';
}

// Get file language from path
function getFileLanguage(filePath) {
  const ext = filePath.split('.').pop() || '';
  const langs = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'json': 'json',
    'css': 'css',
    'html': 'html',
    'md': 'markdown'
  };
  return langs[ext] || '';
}

// Configure marked for markdown rendering with custom renderer
if (typeof marked !== 'undefined') {
  const renderer = new marked.Renderer();

  // Custom code block renderer with syntax highlighting
  renderer.code = function(code, language) {
    let highlighted = code;
    if (typeof hljs !== 'undefined') {
      if (language && hljs.getLanguage(language)) {
        try {
          highlighted = hljs.highlight(code, { language }).value;
        } catch (e) {
          highlighted = escapeHtml(code);
        }
      } else {
        try {
          highlighted = hljs.highlightAuto(code).value;
        } catch (e) {
          highlighted = escapeHtml(code);
        }
      }
    } else {
      highlighted = escapeHtml(code);
    }
    return `<pre><code class="hljs${language ? ` language-${language}` : ''}">${highlighted}</code></pre>`;
  };

  marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true
  });
}

// Apply syntax highlighting to code blocks in a container
function applyHighlighting(container) {
  if (typeof hljs === 'undefined') return;

  // Find all pre>code blocks that haven't been highlighted yet (from markdown)
  container.querySelectorAll('pre code:not(.hljs)').forEach(block => {
    hljs.highlightElement(block);
  });
}

// Format text with markdown
function formatText(text) {
  // Use marked if available
  if (typeof marked !== 'undefined') {
    try {
      const html = marked.parse(text);
      return `<div class="markdown-content">${html}</div>`;
    } catch (e) {
      console.error('Markdown parse error:', e);
    }
  }

  // Fallback to basic formatting
  let html = escapeHtml(text);

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<div class="standalone-code">${renderCodeBlock(code.trim(), lang)}</div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Paragraphs
  html = html.split('\n\n').map(p => `<p>${p}</p>`).join('');

  return html;
}

// Go back to list view
async function showList() {
  // Clear session from URL
  clearSessionUrl();

  // Stop SSE first
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }

  // Cleanup message loader
  if (state.messageLoader) {
    state.messageLoader.disconnect();
    state.messageLoader = null;
  }

  state.currentSession = null;
  document.title = 'Cloister';

  // Switch views
  document.getElementById('list-view').classList.remove('hidden');
  document.getElementById('detail-view').classList.remove('active');

  // Reset scroll position to top of list view
  document.getElementById('list-view').scrollTop = 0;

  // Refresh session list and wait for it to complete
  await loadSessions();
}

// Start SSE for live updates
function startEventStream(sessionId) {
  if (state.eventSource) {
    state.eventSource.close();
  }

  state.eventSource = new EventSource(`/api/sessions/${sessionId}/events`);

  state.eventSource.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);

    // Add new message to current session
    if (state.currentSession) {
      state.currentSession.messages.push(message);
      // Append just the new message instead of re-rendering everything
      appendMessage(message);
    }
  });

  state.eventSource.addEventListener('status', (event) => {
    const { status } = JSON.parse(event.data);

    if (state.currentSession) {
      const oldStatus = state.currentSession.status;
      state.currentSession.status = status;
      // Only update the status UI, not re-render everything
      updateStatusUI(status);
      updateDocumentTitle(status);

      // Send notification if status changed to awaiting
      if (oldStatus !== 'awaiting' && status === 'awaiting') {
        showAwaitingNotification(state.currentSession.title, state.currentSession.project);
      }
    }
  });

  state.eventSource.addEventListener('error', () => {
    console.log('SSE connection error, will reconnect...');
  });
}

// Append a single new message (for SSE updates)
function appendMessage(message) {
  const container = document.getElementById('messages');

  // Check if we should auto-scroll (user is near bottom)
  const shouldScroll = isNearBottom(container);

  // Build toolResults from existing messages for context
  const toolResults = new Map();
  if (state.currentSession) {
    state.currentSession.messages.forEach(msg => {
      if (Array.isArray(msg.content)) {
        msg.content.forEach(block => {
          if (block.type === 'tool_result' && block.tool_use_id) {
            toolResults.set(block.tool_use_id, block);
          }
        });
      }
    });
  }

  // Check if this message contains tool_results that answer questions
  // If so, update the existing question cards instead of just appending
  if (Array.isArray(message.content)) {
    message.content.forEach(block => {
      if (block.type === 'tool_result' && block.tool_use_id) {
        updateQuestionCardIfNeeded(block.tool_use_id, toolResults);
      }
    });
  }

  if (!hasDisplayableContent(message.content)) return;

  const isUser = message.type === 'user';
  const label = isUser ? 'You' : 'Claude';
  const contentHtml = renderMessageContent(message.content, toolResults);

  if (!contentHtml.trim()) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${message.type}`;
  messageDiv.innerHTML = `
    <div class="message-label">${label}</div>
    <div class="message-content">
      ${contentHtml}
    </div>
  `;

  // Insert before the status indicator if it exists, to keep it pinned at the bottom
  const statusIndicator = container.querySelector('.status-indicator-message');
  if (statusIndicator) {
    container.insertBefore(messageDiv, statusIndicator);
  } else {
    container.appendChild(messageDiv);
  }

  // Setup event listeners for new content (including deferred tool content)
  messageDiv.querySelectorAll('.tool-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const toolCard = header.parentElement;
      toolCard.classList.toggle('collapsed');

      // Handle deferred tool result rendering
      if (toolCard.classList.contains('deferred') && !toolCard.classList.contains('collapsed')) {
        loadDeferredToolContent(toolCard);
      }
    });
  });

  messageDiv.querySelectorAll('.thinking-block').forEach(block => {
    block.addEventListener('click', () => {
      block.classList.toggle('expanded');
    });
  });

  // Apply syntax highlighting to new code blocks
  applyHighlighting(messageDiv);

  // Scroll if user was near bottom
  if (shouldScroll) {
    scrollToBottom();
  }
}

// Update a question card if a tool_result answers it
function updateQuestionCardIfNeeded(toolUseId, toolResults) {
  if (!state.currentSession) return;

  // Find the original tool_use block that this result answers
  let originalToolUse = null;
  for (const msg of state.currentSession.messages) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_use' && block.id === toolUseId && block.name === 'AskUserQuestion') {
          originalToolUse = block;
          break;
        }
      }
    }
    if (originalToolUse) break;
  }

  if (!originalToolUse || !originalToolUse.input?.questions) return;

  // Find the question card in the DOM that matches this tool_use
  // Question cards don't have IDs, so we need to find them by content
  const questionCards = document.querySelectorAll('.question-card');
  const questions = originalToolUse.input.questions;

  // Get the result to parse the answers
  const result = toolResults.get(toolUseId);
  if (!result) return;

  let selectedAnswers = null;
  try {
    const resultContent = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    selectedAnswers = parseQuestionAnswers(resultContent, questions);
  } catch (e) {
    // Ignore parsing errors
  }

  if (!selectedAnswers) return;

  // Find the question card(s) that match these questions and update them
  // We match by comparing question text
  questionCards.forEach(card => {
    const questionText = card.querySelector('.question-text');
    if (!questionText) return;

    // Check if this card matches one of our questions
    questions.forEach((q, qIndex) => {
      if (questionText.textContent === q.question) {
        // Update the title to show it's been answered
        const title = card.querySelector('.question-title');
        if (title && title.textContent === 'Claude is asking') {
          title.textContent = 'Claude asked';
        }

        // Update options to show selected state
        const options = card.querySelectorAll('.question-option');
        options.forEach((opt, optIndex) => {
          if (selectedAnswers[qIndex] === optIndex) {
            opt.classList.add('selected');
          }
        });
      }
    });
  });
}

// Update browser tab title to reflect session status
function updateDocumentTitle(status) {
  if (!status || status === 'idle') {
    document.title = 'Cloister';
  } else if (status === 'working') {
    document.title = 'Cloister: Claude is working...';
  } else if (status === 'awaiting') {
    document.title = 'Cloister: Claude is waiting for your input';
  }
}

// Update only the status-related UI elements
function updateStatusUI(status) {
  // Update meta line
  const metaContainer = document.getElementById('detail-meta');
  const existingIndicator = metaContainer.querySelector('.live-indicator');

  if (status === 'idle') {
    if (existingIndicator) {
      // Remove the indicator and preceding dot
      const prevDot = existingIndicator.previousElementSibling;
      if (prevDot) prevDot.remove();
      existingIndicator.remove();
    }
  } else {
    const indicatorHtml = `
      <span class="live-indicator ${status}">
        <span class="live-dot"></span>
        ${status === 'awaiting' ? 'Awaiting your input' : 'Working...'}
      </span>
    `;

    if (existingIndicator) {
      existingIndicator.outerHTML = indicatorHtml;
    } else {
      metaContainer.insertAdjacentHTML('beforeend', `<span>&#x2022;</span>${indicatorHtml}`);
    }
  }

  // Update floating indicator (no longer using top banner that causes layout shifts)
  updateStatusIndicator();
}

// Update the in-flow status indicator at the bottom of the message list
function updateStatusIndicator() {
  const container = document.getElementById('messages');
  if (!container) return;

  // Remove any existing status indicator
  const existingIndicator = container.querySelector('.status-indicator-message');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Only show if session is in awaiting or working state
  if (!state.currentSession) return;

  const status = state.currentSession.status;
  if (status !== 'awaiting' && status !== 'working') return;

  // Create the status indicator as an in-flow message element
  const indicator = document.createElement('div');
  indicator.className = `status-indicator-message status-indicator-${status}`;

  if (status === 'awaiting') {
    indicator.innerHTML = `
      <div class="status-indicator-content">
        <span class="status-indicator-icon">&#x270B;</span>
        <div class="status-indicator-text">
          <span class="status-indicator-title">Claude is waiting for your input</span>
          <span class="status-indicator-hint">Run <code>claude --continue</code> in your terminal to respond</span>
        </div>
        <button class="status-indicator-action" onclick="copyTerminalCommand()">Copy command</button>
      </div>
    `;
  } else if (status === 'working') {
    indicator.innerHTML = `
      <div class="status-indicator-content">
        <span class="status-indicator-spinner"></span>
        <div class="status-indicator-text">
          <span class="status-indicator-title">Claude is working...</span>
          <span class="status-indicator-hint">New messages will appear automatically</span>
        </div>
      </div>
    `;
  }

  container.appendChild(indicator);

  // Scroll to show the indicator
  indicator.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Copy terminal command to clipboard
function copyTerminalCommand() {
  if (!state.currentSession) return;

  const command = `cd ${state.currentSession.project} && claude --continue`;
  navigator.clipboard.writeText(command).then(() => {
    const btn = document.querySelector('.status-indicator-action');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 2000);
    }
  });
}

// Scroll to bottom of messages container
function scrollToBottom() {
  const messagesContainer = document.getElementById('messages');

  // Use multiple attempts to ensure scroll works after DOM updates
  const doScroll = () => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // Immediate attempt
  doScroll();

  // After next frame
  requestAnimationFrame(doScroll);

  // Fallback after a short delay (for images/fonts loading)
  setTimeout(doScroll, 100);
}

// Browser notifications
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    // Could show a prompt, but for now just log
    console.log('Notification permission not yet requested');
  }
}

function showAwaitingNotification(title, project) {
  if (Notification.permission === 'granted') {
    const notification = new Notification('Claude needs your input', {
      body: title,
      tag: 'claude-awaiting',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

// Keyboard Navigation
function getSessionCards() {
  return Array.from(document.querySelectorAll('#session-list .session-card'));
}

function updateFocusedSession(index) {
  const cards = getSessionCards();

  // Remove focus from all cards
  cards.forEach(card => card.classList.remove('keyboard-focused'));

  // Clamp index to valid range
  if (cards.length === 0) {
    state.focusedSessionIndex = -1;
    return;
  }

  state.focusedSessionIndex = Math.max(0, Math.min(index, cards.length - 1));

  // Add focus to the selected card
  const focusedCard = cards[state.focusedSessionIndex];
  if (focusedCard) {
    focusedCard.classList.add('keyboard-focused');
    // Scroll the card into view if needed
    focusedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function moveFocus(direction) {
  const cards = getSessionCards();
  if (cards.length === 0) return;

  // If no card is focused yet, start at the first one
  if (state.focusedSessionIndex === -1) {
    updateFocusedSession(0);
    return;
  }

  const newIndex = state.focusedSessionIndex + direction;
  updateFocusedSession(newIndex);
}

function openFocusedSession() {
  const cards = getSessionCards();
  if (state.focusedSessionIndex >= 0 && state.focusedSessionIndex < cards.length) {
    const card = cards[state.focusedSessionIndex];
    const sessionId = card.dataset.id;
    if (sessionId) {
      showSession(sessionId);
    }
  }
}

function handleKeyboardNavigation(e) {
  // Don't handle keyboard nav when typing in search
  if (document.activeElement && document.activeElement.tagName === 'INPUT') {
    // Allow Escape to blur search input
    if (e.key === 'Escape') {
      document.activeElement.blur();
      e.preventDefault();
    }
    return;
  }

  // Check if we're in list view or detail view
  const listView = document.getElementById('list-view');
  const isInListView = !listView.classList.contains('hidden');

  if (isInListView) {
    switch (e.key) {
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        moveFocus(-1);
        break;
      case 'Enter':
        e.preventDefault();
        openFocusedSession();
        break;
      case '/':
        // Focus search input
        e.preventDefault();
        document.getElementById('search-input').focus();
        break;
    }
  } else {
    // In detail view
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        showList();
        break;
    }
  }
}

// Path-based routing for permalinks
function setupRouting() {
  window.addEventListener('popstate', handleRoute);
}

async function handleRoute() {
  const path = window.location.pathname;

  // Parse the path: expected format is /session/{uuid}
  if (path.startsWith('/session/')) {
    const sessionId = path.slice('/session/'.length);
    if (sessionId) {
      await navigateToSession(sessionId);
    }
  } else if (path === '/' || path === '') {
    // Root path - show list view if currently in detail view
    if (state.currentSession) {
      returnToListViewWithoutUrlUpdate();
    }
  }
}

// Navigate to a session by ID (used by path routing)
async function navigateToSession(sessionId) {
  // Check if we're already viewing this session
  if (state.currentSession && state.currentSession.id === sessionId) {
    return;
  }

  try {
    // Show loading state
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Loading messages...</div>';

    // Switch to detail view immediately for responsiveness
    document.getElementById('list-view').classList.add('hidden');
    document.getElementById('detail-view').classList.add('active');

    // Reset messages scroll position for new session
    messagesContainer.scrollTop = 0;

    const response = await fetch(`/api/sessions/${sessionId}`);

    if (!response.ok) {
      // Session not found - show error and return to list
      showSessionNotFoundError(sessionId);
      return;
    }

    const data = await response.json();

    if (!data.session) {
      showSessionNotFoundError(sessionId);
      return;
    }

    state.currentSession = data.session;
    renderSessionDetail(data.session, true);
    updateDocumentTitle(data.session.status);

    // Start SSE for live updates
    startEventStream(sessionId);
  } catch (error) {
    console.error('Failed to load session:', error);
    showSessionNotFoundError(sessionId);
  }
}

// Show error when session is not found
function showSessionNotFoundError(sessionId) {
  const messagesContainer = document.getElementById('messages');
  messagesContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">&#x26A0;</div>
      <div class="empty-state-title">Session not found</div>
      <div class="empty-state-text">The session "${escapeHtml(sessionId)}" could not be found. It may have been deleted.</div>
      <button class="back-link" onclick="showList()">&#x2190; Return to session list</button>
    </div>
  `;

  // Update the header to show it's an invalid session
  document.getElementById('detail-title').textContent = 'Session not found';
  document.getElementById('detail-meta').innerHTML = '';
}

// Return to list view without updating URL (used when popstate triggers the change)
function returnToListViewWithoutUrlUpdate() {
  // Stop SSE
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }

  // Cleanup message loader
  if (state.messageLoader) {
    state.messageLoader.disconnect();
    state.messageLoader = null;
  }

  state.currentSession = null;
  document.title = 'Cloister';

  // Switch views
  document.getElementById('list-view').classList.remove('hidden');
  document.getElementById('detail-view').classList.remove('active');

  // Reset scroll position to top of list view
  document.getElementById('list-view').scrollTop = 0;
}

// Update URL path when viewing a session
function updateUrlForSession(sessionId) {
  const newPath = `/session/${sessionId}`;
  if (window.location.pathname !== newPath) {
    history.pushState(null, '', newPath);
  }
}

// Clear session from URL when returning to list
function clearSessionUrl() {
  if (window.location.pathname !== '/') {
    history.pushState(null, '', '/');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Keyboard navigation
  document.addEventListener('keydown', handleKeyboardNavigation);

  // Time filters
  document.querySelectorAll('#time-filters .filter-item').forEach(el => {
    el.addEventListener('click', () => filterByTime(el.dataset.filter));
  });

  // Search
  const searchInput = document.getElementById('search-input');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value;
      renderSessionList();
    }, 200);
  });

  // Back button
  document.getElementById('back-button').addEventListener('click', showList);

}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Initialize
init();
