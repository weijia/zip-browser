import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldIgnoreClickAfterSelection } from '../web/text-selection-guard.js';

test('拖选文本产生的位移会吞掉 click', () => {
  assert.equal(shouldIgnoreClickAfterSelection({ dx: 12, dy: 2 }), true);
  assert.equal(shouldIgnoreClickAfterSelection({ dx: 2, dy: -30 }), true);
});

test('位移很小且无选区时放行正常单击', () => {
  assert.equal(shouldIgnoreClickAfterSelection({ dx: 1, dy: -2 }), false);
  assert.equal(shouldIgnoreClickAfterSelection(), false);
});

test('非空文本选区会吞掉 click（即使鼠标几乎没动）', () => {
  assert.equal(shouldIgnoreClickAfterSelection({ selectionText: 'WDC PC SN730' }), true);
  assert.equal(shouldIgnoreClickAfterSelection({ dx: 3, dy: 1, selectionText: 'LAPTOP-91PR81Q2' }), true);
});

test('折叠的选区（空字符串）不算文本选择', () => {
  assert.equal(shouldIgnoreClickAfterSelection({ selectionText: '' }), false);
  assert.equal(shouldIgnoreClickAfterSelection({ selectionText: '   ' }), false);
});

test('按钮/输入框等交互控件忽略选区判断，但仍拦截拖拽', () => {
  assert.equal(shouldIgnoreClickAfterSelection({ selectionText: '已有选中文本', interactive: true }), false);
  assert.equal(shouldIgnoreClickAfterSelection({ dx: 20, selectionText: '已有选中文本', interactive: true }), true);
});
