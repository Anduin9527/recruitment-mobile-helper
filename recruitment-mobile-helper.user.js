// ==UserScript==
// @name         北森招聘：自动填手机号并获取验证码
// @namespace    local.zhiye.mobile
// @author       Anduin9527
// @license      MIT
// @homepageURL  https://github.com/Anduin9527/recruitment-mobile-helper
// @supportURL   https://github.com/Anduin9527/recruitment-mobile-helper/issues
// @downloadURL  https://raw.githubusercontent.com/Anduin9527/recruitment-mobile-helper/main/recruitment-mobile-helper.user.js
// @updateURL    https://raw.githubusercontent.com/Anduin9527/recruitment-mobile-helper/main/recruitment-mobile-helper.user.js
// @version      1.2.4
// @description  点击后填写手机号并获取验证码；税友 campus 同时勾选隐私协议。不填写验证码、不提交登录。
// @match        https://*.zhiye.com/login*
// @match        https://campus.servyou.com.cn/campus-recruitment/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const validMobile = value => /^1[3-9]\d{9}$/.test(value);
  const visible = el => {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.hidden || node.getAttribute('aria-hidden') === 'true' ||
          style.display === 'none' || style.visibility === 'hidden' ||
          style.visibility === 'collapse' || Number(style.opacity) === 0) return false;
    }
    return true;
  };
  const marker = 'data-zhiye-mobile-helper';
  const mounted = new Map();
  let busy = false;

  function site() {
    if (/(^|\.)zhiye\.com$/i.test(location.hostname) && /^\/login(?:\/|$)/i.test(location.pathname)) {
      return 'zhiye';
    }
    if (location.hostname === 'campus.servyou.com.cn' && location.pathname.startsWith('/campus-recruitment/')) {
      return 'campus';
    }
    return null;
  }

  function configure() {
    const result = prompt('设置预设手机号（仅保存在油猴本地存储）：', GM_getValue('mobile', ''));
    if (result === null) return false;
    const mobile = result.replace(/\s/g, '');
    if (!validMobile(mobile)) {
      alert('请输入有效的中国大陆 11 位手机号。');
      return false;
    }
    GM_setValue('mobile', mobile);
    return true;
  }

  GM_registerMenuCommand('设置 / 修改预设手机号', configure);
  GM_registerMenuCommand('清除预设手机号', () => GM_setValue('mobile', ''));
  GM_registerMenuCommand('填写手机号并获取验证码（campus 同时同意隐私协议）', () => {
    mount();
    const entries = [...mounted].filter(([input]) => visible(input));
    if (entries.length !== 1) {
      alert('请先打开手机号登录弹窗，并确保只有一个手机号输入框可见。');
      return;
    }
    void run(...entries[0]);
  });

  function scopeFor(input, currentSite) {
    if (currentSite === 'campus') {
      // Moka 弹窗的类名带构建哈希，只使用稳定的组件名前缀。
      const modal = input.closest('[class*="sd-Modal-content-"], [role="dialog"]');
      // 普通简历表单也可能使用相同 placeholder；必须确认是手机号登录弹窗。
      if (!visible(modal) || !visible(input)) return null;
      const text = modal.textContent;
      const code = modal.querySelector('input[placeholder="请输入验证码"]');
      const login = Array.from(modal.querySelectorAll('button,[role="button"]'))
        .some(el => visible(el) && el.textContent.trim() === '登录');
      if (!text.includes('手机号登录') || !text.includes('隐私协议') ||
          !visible(code) || !login) return null;
      return modal;
    }
    return input.closest('[role="dialog"], form') || document;
  }

  function setStatus(button, text, title) {
    button.textContent = text;
    button.title = title;
    button.setAttribute('aria-label', title);
  }

  async function run(input, trigger) {
    if (busy) return;
    const currentSite = site();
    if (!currentSite || !scopeFor(input, currentSite)) return;
    const startURL = location.href;
    busy = true;
    trigger.disabled = true;
    let success = false;
    try {
      let mobile = GM_getValue('mobile', '');
      if (!validMobile(mobile)) {
        if (!configure()) return;
        mobile = GM_getValue('mobile', '');
      }
      const scope = scopeFor(input, currentSite);
      if (!visible(input) || input.disabled || input.readOnly || !scope) {
        alert('手机号输入框暂不可用。');
        return;
      }
      setStatus(trigger, '⋯', '正在填写手机号…');
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, mobile);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
      await new Promise(resolve => setTimeout(resolve, 800));
      if (location.href !== startURL || site() !== currentSite || !visible(input) || scopeFor(input, currentSite) !== scope) return;
      if (input.value !== mobile) {
        alert('页面未保留填入的手机号，请手动检查。');
        return;
      }

      if (currentSite === 'campus') {
        const agreements = Array.from(scope.querySelectorAll('input[type="checkbox"]'))
          .filter(el => visible(el.closest('label') || el));
        if (!scope.textContent.includes('首次登录会自动创建新账号') ||
            !scope.textContent.includes('隐私协议') || agreements.length !== 1) {
          alert('手机号已填写，但未找到唯一的隐私协议勾选框，请手动检查。');
          return;
        }
        const agreement = agreements[0];
        if (!agreement.checked) {
          if (agreement.disabled || agreement.closest('[aria-disabled="true"]')) {
            alert('手机号已填写，但隐私协议暂不可勾选。');
            return;
          }
          agreement.click();
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        if (location.href !== startURL || site() !== currentSite || !visible(input) || input.value !== mobile ||
            scopeFor(input, currentSite) !== scope) return;
        const checked = Array.from(scope.querySelectorAll('input[type="checkbox"]'))
          .filter(el => visible(el.closest('label') || el));
        if (checked.length !== 1 || !checked[0].checked) {
          alert('手机号已填写，但协议未勾选成功，请手动勾选后获取验证码。');
          return;
        }
      }

      const remaining = 60000 - (Date.now() - Number(GM_getValue('lastClickAt', 0)));
      if (remaining > 0) {
        alert(`手机号已填写。刚刚已点击过获取验证码，请等待 ${Math.ceil(remaining / 1000)} 秒后再试。`);
        return;
      }
      const candidates = Array.from(scope.querySelectorAll('span,button,a,[role="button"]'))
        .filter(el => visible(el) && el.textContent.trim() === '获取验证码');
      const leaves = candidates.filter(el => !candidates.some(other => other !== el && el.contains(other)));
      if (leaves.length !== 1) {
        alert('手机号已填写，但未找到唯一的“获取验证码”按钮（可能正在倒计时），请手动点击。');
        return;
      }
      const button = leaves[0].closest('button,a,[role="button"]') || leaves[0];
      if (button.closest('[disabled],[aria-disabled="true"]') || getComputedStyle(button).pointerEvents === 'none') {
        alert('手机号已填写，“获取验证码”暂不可点击。');
        return;
      }
      GM_setValue('lastClickAt', Date.now());
      button.click();
      success = true;
      setStatus(trigger, '✓', '已点击获取验证码');
    } catch (error) {
      console.error('[招聘手机号助手]', error);
      alert('操作未完成，请手动检查页面。');
    } finally {
      busy = false;
      trigger.disabled = false;
      if (!success) setStatus(trigger, 'ϟ', currentSite === 'campus' ? '填写手机号、同意隐私协议并获取验证码' : '填手机号并获取验证码');
    }
  }

  function mount() {
    const currentSite = site();
    for (const [input, trigger] of mounted) {
      if (!currentSite || !visible(input) || !trigger.isConnected || !scopeFor(input, currentSite)) {
        trigger.remove();
        mounted.delete(input);
      } else if (currentSite === 'campus') {
        position(input, trigger);
      }
    }
    if (!currentSite) return;
    for (const input of document.querySelectorAll('input[placeholder="请输入手机号"]')) {
      if (!visible(input) || input.disabled || input.readOnly || mounted.has(input) || !scopeFor(input, currentSite)) continue;
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.setAttribute(marker, 'true');
      setStatus(trigger, 'ϟ', currentSite === 'campus' ? '填写手机号、同意隐私协议并获取验证码' : '填手机号并获取验证码');
      trigger.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;position:relative;z-index:10;width:26px;height:26px;min-width:26px;min-height:26px;box-sizing:border-box;margin:4px 0;padding:0;border:0;border-radius:50%;background:#eff6ff;color:#2563eb;font-family:Arial,sans-serif;font-size:20px;font-weight:600;line-height:1;cursor:pointer;vertical-align:middle;';
      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        void run(input, trigger);
      });
      if (currentSite === 'campus') {
        // 独立浮层不参与弹窗布局，避免被输入框父容器裁切。
        trigger.style.cssText = 'all:initial!important;position:fixed!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;width:30px!important;height:30px!important;box-sizing:border-box!important;border:1px solid #93c5fd!important;border-radius:50%!important;background:#eff6ff!important;color:#2563eb!important;font:600 22px/1 Arial,sans-serif!important;cursor:pointer!important;pointer-events:auto!important;box-shadow:0 1px 5px #0002!important;';
        document.body.appendChild(trigger);
        position(input, trigger);
      } else {
        input.insertAdjacentElement('afterend', trigger);
      }
      mounted.set(input, trigger);
    }
  }

  function position(input, trigger) {
    const rect = input.getBoundingClientRect();
    const inViewport = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    trigger.style.setProperty('display', inViewport ? 'flex' : 'none', 'important');
    trigger.style.setProperty('left', `${Math.max(0, Math.min(innerWidth - 32, rect.right - 36))}px`, 'important');
    trigger.style.setProperty('top', `${Math.max(0, rect.top + (rect.height - 30) / 2)}px`, 'important');
  }

  const reposition = () => {
    mount();
  };
  window.addEventListener('hashchange', mount);
  window.addEventListener('popstate', mount);
  window.addEventListener('resize', reposition);
  document.addEventListener('scroll', reposition, true);

  // 弹窗可能延迟出现、关闭后重新创建；轮询只挂载按钮，不读取号码或请求短信。
  setInterval(mount, 700);
  mount();
})();
