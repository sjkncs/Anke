import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ankeAnswerText} from '../src/lib/anke-answer-text.ts';
test('Anke answer prose hides complete and incomplete Markdown markers',()=>{
  assert.equal(ankeAnswerText('## 结论\n- **所有新闻**应保留来源。\n* 尚未结束**'),'结论\n所有新闻应保留来源。\n尚未结束');
  for(const text of ['*','**结论','### 标题\n- 事项'])assert.doesNotMatch(ankeAnswerText(text),/[#*]/);
  const literals='2023-2026 -5 https://example.com/a-b#part `a*b`\n-5\n```js\na*b-c#d\n```';
  assert.equal(ankeAnswerText(literals),literals);
  assert.equal(ankeAnswerText(ankeAnswerText('**内容**')),ankeAnswerText('**内容**'));
});

test('Agent copy actions use the same plain answer projection as display',()=>{
  const turn=readFileSync(new URL('../src/features/chat/transcript/AssistantTurn.tsx',import.meta.url),'utf8');
  const transcript=readFileSync(new URL('../src/features/chat/transcript/ChatTranscript.tsx',import.meta.url),'utf8');
  assert.match(turn,/ankeAnswerText\(getAssistantTurnContent\(entry\)\)/);
  assert.match(transcript,/copyText\(ankeAnswerText\(lastAnswer\)\)/);
});
