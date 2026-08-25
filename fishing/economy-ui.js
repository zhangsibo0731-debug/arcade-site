(function (global) {
  'use strict';

  function create(options) {
    const economy = options.economy;
    const ui = options.ui;
    const elements = options.elements;
    let feedbackTimer = 0;
    let saleBusy = false;

    function state() {
      return options.getState();
    }

    function renderBar() {
      const current = state();
      ui.renderEconomyBar({ coins: current.coins, bagCount: current.fishBag.length, capacity: economy.BAG_CAPACITY });
    }

    function renderBasket() {
      const current = state();
      ui.renderBasket(current.fishBag, current.coins, {
        total: economy.bagValue(current.fishBag),
        capacity: economy.BAG_CAPACITY,
        packPrice: economy.premiumBaitPack.price,
        packAmount: economy.premiumBaitPack.amount,
        baitCount: current.tackle.premiumBait,
        maxBait: economy.MAX_BAIT,
      });
    }

    function showFeedback(message) {
      clearTimeout(feedbackTimer);
      elements.feedback.textContent = message;
      elements.feedback.hidden = false;
      elements.feedback.classList.remove('is-visible');
      void elements.feedback.offsetWidth;
      elements.feedback.classList.add('is-visible');
      feedbackTimer = setTimeout(() => {
        elements.feedback.hidden = true;
        elements.feedback.classList.remove('is-visible');
      }, 2200);
    }

    function animateCoinGain(amount) {
      if (!amount) return;
      elements.coinCount.dataset.gain = '+' + amount;
      elements.coinCount.classList.remove('is-gaining');
      void elements.coinCount.offsetWidth;
      elements.coinCount.classList.add('is-gaining');
    }

    function finishSale(next, income, message) {
      const latest = state();
      options.updateState(Object.assign({}, next, {
        coins: Math.min(economy.MAX_COINS, latest.coins + income),
      }));
      options.saveEconomy();
      renderBar();
      renderBasket();
      animateCoinGain(income);
      showFeedback(message);
      saleBusy = false;
      options.play('success');
    }

    function sellAll() {
      const current = state();
      if (!current.fishBag.length || saleBusy) return;
      saleBusy = true;
      const income = economy.bagValue(current.fishBag);
      Array.from(elements.basketList.querySelectorAll('.basket-row')).forEach((row, index) => {
        row.style.setProperty('--sell-delay', index * 24 + 'ms');
        row.classList.add('is-selling');
      });
      setTimeout(() => finishSale({
        fishBag: [],
      }, income, '全部出售成功 · 收入 +' + income + ' 🪙'), 280);
    }

    function sellAt(index, row) {
      const current = state();
      if (saleBusy || !Number.isInteger(index) || index < 0 || index >= current.fishBag.length) return;
      saleBusy = true;
      if (row) row.classList.add('is-selling');
      setTimeout(() => {
        const fishBag = current.fishBag.slice();
        const sold = fishBag.splice(index, 1)[0];
        finishSale({ fishBag }, sold.value, '已出售 · 收入 +' + sold.value + ' 🪙');
      }, row ? 220 : 0);
    }

    function buyPremiumBait() {
      const current = state();
      const pack = economy.premiumBaitPack;
      if (current.coins < pack.price) {
        showFeedback('金币不足 · 还差 ' + (pack.price - current.coins) + ' 🪙');
        return;
      }
      if (current.tackle.premiumBait > economy.MAX_BAIT - pack.amount) {
        showFeedback('高级鱼饵已接近上限');
        return;
      }
      const tackle = Object.assign({}, current.tackle, {
        premiumBait: current.tackle.premiumBait + pack.amount,
        selectedBait: 'premium',
      });
      options.updateState({ coins: current.coins - pack.price, tackle });
      options.saveTackle();
      options.saveEconomy();
      renderBar();
      elements.coinCount.classList.add('is-spending');
      setTimeout(() => elements.coinCount.classList.remove('is-spending'), 420);
      renderBasket();
      options.renderTackle();
      showFeedback('购买成功 · 高级鱼饵 +' + pack.amount + ' · 已自动装备，下一竿生效');
      options.play('success');
    }

    return Object.freeze({ renderBar, renderBasket, sellAll, sellAt, buyPremiumBait });
  }

  global.FishingEconomyUI = Object.freeze({ create });
})(window);
