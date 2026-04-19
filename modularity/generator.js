const HP = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--panel-unit-w'));
const GRID = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-size'));

const baseModules = [
  {
    hp: 2,
    sizeLabel: '2hp',
    title: null,
    parts: [
      { type: 'screw', x: 1, y: 0.7 },
      { type: 'divider', x: 1, y: 2.6, w: 1.2 },
      { type: 'knob-md', x: 1, y: 5.0 },
      { type: 'knob-sm', x: 1, y: 6.9 },
      { type: 'jack', x: 1, y: 9.4, label: 'CV IN' },
      { type: 'jack', x: 1, y: 12.5, label: 'OUT' },
      { type: 'screw', x: 1, y: 14.8 }
    ]
  },
  {
    hp: 4,
    sizeLabel: '4hp',
    title: { name: 'Name', subtitle: 'Module Subtitle', y: 1.35 },
    parts: [
      { type: 'screw', x: 1, y: 0.7 },
      { type: 'screw', x: 3, y: 0.7 },
      { type: 'divider', x: 2, y: 2.6, w: 3.2 },

      { type: 'knob-lg', x: 2, y: 4.8, label: 'FREQ' },
      { type: 'knob-md', x: 1, y: 6.8 },
      { type: 'knob-md', x: 3, y: 6.8 },
      { type: 'knob-sm', x: 1, y: 8.8, label: 'SPREAD' },
      { type: 'knob-sm', x: 3, y: 8.8, label: 'TILT' },

      { type: 'jack', x: 1, y: 10.9, label: 'MIX A' },
      { type: 'jack', x: 3, y: 10.9, label: 'MIX B' },
      { type: 'jack-square', x: 2, y: 13.0, label: 'OUT' },

      { type: 'screw', x: 1, y: 14.8 },
      { type: 'screw', x: 3, y: 14.8 }
    ]
  },
  {
    hp: 4,
    sizeLabel: '4hp',
    title: { name: 'Tera', subtitle: 'Module Subtitle', y: 1.35 },
    parts: [
      { type: 'divider', x: 2, y: 2.6, w: 3.2 },
      { type: 'knob-md', x: 2, y: 4.8, label: 'FIRE' },
      { type: 'knob-md', x: 2, y: 6.8, label: 'WATER' },
      { type: 'jack', x: 1, y: 9.2, label: 'INPUT' },
      { type: 'jack', x: 3, y: 9.2, label: 'OUT' },
      { type: 'slider', x: 2, y: 12.0, label: 'SMOKE' },
      { type: 'screw', x: 2, y: 14.8 }
    ]
  }
];

const rack = document.getElementById('rack');
const shuffleButton = document.getElementById('shuffleButton');
const resetButton = document.getElementById('resetButton');

function unitX(x) {
  return x * GRID - GRID / 2;
}

function unitY(y) {
  return y * GRID - GRID / 2;
}

function createPart(part) {
  const el = document.createElement('div');
  el.classList.add('part');

  if (part.type === 'screw') {
    el.classList.add('screw-hole');
    el.style.left = `${unitX(part.x)}px`;
    el.style.top = `${unitY(part.y)}px`;
    return el;
  }

  if (part.type === 'divider') {
    el.classList.add('divider');
    el.style.left = `${unitX(part.x)}px`;
    el.style.top = `${unitY(part.y)}px`;
    el.style.width = `${part.w * GRID}px`;
    return el;
  }

  if (part.type === 'knob-lg' || part.type === 'knob-md' || part.type === 'knob-sm') {
    el.classList.add('knob', part.type);
  }

  if (part.type === 'jack') {
    el.classList.add('jack');
  }

  if (part.type === 'jack-square') {
    el.classList.add('jack', 'square-ring');
  }

  if (part.type === 'slider') {
    el.classList.add('slider');
  }

  if (part.type === 'screen') {
    el.classList.add('screen');
  }

  el.style.left = `${unitX(part.x)}px`;
  el.style.top = `${unitY(part.y)}px`;

  return el;
}

function createLabel(text, x, y) {
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = text;
  label.style.left = `${unitX(x)}px`;
  label.style.top = `${unitY(y)}px`;
  return label;
}

function createTitle(title, hp) {
  const wrap = document.createElement('div');
  wrap.className = 'module-title';
  wrap.style.top = `${unitY(title.y)}px`;

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = title.name;

  const subtitle = document.createElement('span');
  subtitle.className = 'subtitle';
  subtitle.textContent = title.subtitle;

  wrap.appendChild(name);
  wrap.appendChild(subtitle);
  return wrap;
}

function renderModules(modules) {
  rack.innerHTML = '';

  modules.forEach((moduleData) => {
    const module = document.createElement('div');
    module.className = 'module';
    module.style.width = `${moduleData.hp * HP}px`;

    if (moduleData.title) {
      module.appendChild(createTitle(moduleData.title, moduleData.hp));
    }

    moduleData.parts.forEach((part) => {
      module.appendChild(createPart(part));

      if (part.label) {
        let labelY = part.y + 0.95;

        if (part.type === 'knob-lg') labelY = part.y + 1.0;
        if (part.type === 'knob-md') labelY = part.y + 0.95;
        if (part.type === 'knob-sm') labelY = part.y + 0.8;
        if (part.type === 'jack' || part.type === 'jack-square') labelY = part.y + 0.95;
        if (part.type === 'slider') labelY = part.y + 1.9;

        module.appendChild(createLabel(part.label, part.x, labelY));
      }
    });

    const size = document.createElement('div');
    size.className = 'module-size';
    size.textContent = moduleData.sizeLabel;
    module.appendChild(size);

    rack.appendChild(module);
  });
}

function cloneModules(data) {
  return JSON.parse(JSON.stringify(data));
}

function shuffleDemo() {
  const next = cloneModules(baseModules);

  next[0].parts[2].type = Math.random() > 0.5 ? 'knob-md' : 'knob-lg';
  next[1].title.name = ['Name', 'Nova', 'Flux', 'Vector'][Math.floor(Math.random() * 4)];
  next[2].title.name = ['Tera', 'Phase', 'Atlas', 'Drift'][Math.floor(Math.random() * 4)];

  const fireY = 4.8 + (Math.random() > 0.5 ? 0 : 0.4);
  next[2].parts[1].y = fireY;
  next[2].parts[2].y = fireY + 2.0;

  renderModules(next);
}

shuffleButton.addEventListener('click', shuffleDemo);
resetButton.addEventListener('click', () => renderModules(baseModules));

renderModules(baseModules);
