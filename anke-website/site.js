const demos = {
  housing: ['想找一个离学校近、适合一家人居住的地方。', ['先了解预算、家庭人数与通勤上限。', '比较可用房源的租金、装修与周边配套。', '列出资格、入学和交付条件中需要核实的事项。']],
  work: ['帮我把这周的研究和工作安排得清楚一些。', ['汇总任务、截止时间和已有资料。', '区分优先事项、依赖条件与待确认问题。', '形成可调整的计划，由您决定最终安排。']],
  life: ['我想在忙碌之外，留一点时间照顾自己。', ['了解您的作息、偏好和可支配时间。', '把学习、饮食与活动安排进日常。', '从可坚持的小事开始，随您的反馈调整。']]
};
function selectScene(key) {
  const [question, steps] = demos[key];
  document.querySelector('#question').textContent = question;
  const list = document.createElement('ol');
  for (const step of steps) { const li = document.createElement('li'); li.textContent = step; list.append(li); }
  document.querySelector('#answer').replaceChildren(list);
  document.querySelectorAll('[data-demo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.demo === key)));
}
document.querySelectorAll('[data-demo],[data-scene]').forEach(b => b.addEventListener('click', () => selectScene(b.dataset.demo || b.dataset.scene)));
selectScene('housing');
