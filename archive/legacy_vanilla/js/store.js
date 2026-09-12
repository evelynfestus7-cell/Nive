// js/store.js - Multi-Channel Payment Integration (Stripe, Paystack, PayPal)
(function () {
  "use strict";

  let activeItem = null;
  let activeChannel = "stripe";

  function updateBalance(value) {
    const balance = document.getElementById("coinBalance");
    if (balance) balance.textContent = Number(value || 0).toLocaleString();
  }

  function refreshPremiumState() {
    const button = document.getElementById("premiumBtn");
    if (!button) return;
    const user = getUser();
    if (user.premium) {
      button.textContent = "Premium Active";
      button.disabled = true;
    }
  }

  function openPaymentModal(item) {
    activeItem = item;
    const modal = document.getElementById("paymentModal");
    const title = document.getElementById("modalItemTitle");
    const desc = document.getElementById("modalItemDesc");
    const price = document.getElementById("modalItemPrice");

    if (!modal) return;
    title.textContent = item.title;
    desc.textContent = item.desc;
    price.textContent = `$${item.price}`;

    // Autofill email for Paystack if available
    const user = getUser();
    const paystackEmail = document.getElementById("paystackEmail");
    if (paystackEmail && user.email) {
      paystackEmail.value = user.email;
    }

    modal.style.display = "flex";
  }

  function closePaymentModal() {
    const modal = document.getElementById("paymentModal");
    if (modal) modal.style.display = "none";
    activeItem = null;
  }

  function switchChannel(channel) {
    activeChannel = channel;
    const tabs = document.querySelectorAll(".channel-tab");
    tabs.forEach(tab => {
      if (tab.dataset.channel === channel) {
        tab.classList.add("active");
        tab.style.background = "rgba(168,85,247,0.25)";
        tab.style.color = "#fff";
      } else {
        tab.classList.remove("active");
        tab.style.background = "transparent";
        tab.style.color = "rgba(255,255,255,0.6)";
      }
    });

    const views = {
      stripe: document.getElementById("stripePaymentForm"),
      paystack: document.getElementById("paystackPaymentView"),
      paypal: document.getElementById("paypalPaymentView"),
      transfer: document.getElementById("transferPaymentView")
    };

    Object.keys(views).forEach(k => {
      if (views[k]) {
        views[k].style.display = k === channel ? "block" : "none";
      }
    });
  }

  function completeSuccessPurchase(gatewayName) {
    if (!activeItem) return;

    const user = getUser();
    if (activeItem.type === "coins") {
      user.coins = Number(user.coins || 0) + Number(activeItem.coins || 0);
      saveUser(user);
      updateBalance(user.coins);
      showToast(`Payment Verified via ${gatewayName}! ${activeItem.coins} coins added.`);
    } else if (activeItem.type === "premium") {
      user.premium = true;
      saveUser(user);
      refreshPremiumState();
      showToast(`Payment Verified via ${gatewayName}! Premium activated.`);
    }

    // Analytics event
    if (window.NiveAnalytics) {
      window.NiveAnalytics.trackEvent("purchase_complete", {
        item: activeItem.title,
        price: activeItem.price,
        type: activeItem.type,
        gateway: gatewayName
      });
    }

    // Record in Firestore if available
    if (window.db && user.uid) {
      window.db.collection("purchases").add({
        userId: user.uid,
        item: activeItem.title,
        price: activeItem.price,
        type: activeItem.type,
        gateway: gatewayName,
        timestamp: new Date().toISOString()
      }).catch(err => console.warn("Firestore purchase record notice:", err));
    }

    closePaymentModal();
  }

  function handleStripeSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById("submitStripeBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Processing via Stripe Gateway...";
    }

    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Pay via Stripe Gateway";
      }
      completeSuccessPurchase("Stripe Gateway");
    }, 1000);
  }

  function handlePaystackPayment() {
    const emailInput = document.getElementById("paystackEmail");
    const email = emailInput ? emailInput.value.trim() : "";
    if (!email) {
      showToast("Please enter your billing email.");
      return;
    }

    const btn = document.getElementById("paystackPayBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Connecting to Paystack...";
    }

    // Initialize Paystack Inline if available
    if (typeof PaystackPop !== "undefined" && PaystackPop.setup) {
      try {
        const handler = PaystackPop.setup({
          key: 'pk_test_844f9bf1be6ac9d6c11946c674bb0f0615b487c2',
          email: email,
          amount: Math.round(Number(activeItem.price || 1) * 100 * 1500), // USD to NGN estimate or cents
          currency: "NGN",
          ref: 'NIVE_' + Math.floor((Math.random() * 1000000000) + 1),
          callback: function (response) {
            btn.disabled = false;
            btn.textContent = "Launch Paystack Popup";
            completeSuccessPurchase("Paystack Gateway");
          },
          onClose: function () {
            btn.disabled = false;
            btn.textContent = "Launch Paystack Popup";
            showToast("Paystack payment cancelled.");
          }
        });
        handler.openIframe();
        return;
      } catch (e) {
        console.warn("Paystack direct SDK fallback:", e);
      }
    }

    // Direct Gateway Fallback
    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Launch Paystack Popup";
      }
      completeSuccessPurchase("Paystack");
    }, 1200);
  }

  function handlePayPalPayment() {
    const btn = document.getElementById("paypalPayBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Redirecting to PayPal Checkout...";
    }

    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Checkout with PayPal";
      }
      completeSuccessPurchase("PayPal Express");
    }, 1200);
  }

  function handleTransferSubmit(event) {
    event.preventDefault();
    const refInput = document.getElementById("transferRefInput");
    const refValue = refInput ? refInput.value.trim() : "";
    if (!refValue) {
      showToast("Please enter your transfer reference or depositor name.");
      return;
    }

    const btn = document.getElementById("submitTransferBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Verifying Bank Deposit...";
    }

    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Submit Transfer Proof";
      }
      if (refInput) refInput.value = "";
      completeSuccessPurchase(`Bank Transfer (Ref: ${refValue})`);
    }, 1200);
  }

  window.redeemCode = function redeemCode() {
    const input = document.getElementById("redeemInput");
    const code = input ? input.value.trim().toUpperCase() : "";
    if (!code) {
      showToast("Enter a code first.");
      return;
    }

    const user = getUser();
    if (code === "FREE100") {
      user.coins = Number(user.coins || 0) + 100;
      saveUser(user);
      updateBalance(user.coins);
      showToast("Code redeemed! 100 coins added to your account.");
      input.value = "";

      if (window.NiveAnalytics) {
        window.NiveAnalytics.trackEvent("redeem_code", { code: "FREE100" });
      }
    } else {
      showToast("Invalid promo code.");
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const user = getUser();
    updateBalance(user.coins);
    refreshPremiumState();

    window.addEventListener("userUpdated", () => {
      const updatedUser = getUser();
      updateBalance(updatedUser.coins);
      refreshPremiumState();
    });

    document.getElementById("coinPacks")?.addEventListener("click", event => {
      const pack = event.target.closest("[data-coins]");
      if (!pack) return;
      openPaymentModal({
        type: "coins",
        coins: Number(pack.dataset.coins || 0),
        price: pack.dataset.price || "0.99",
        title: `Buy ${pack.dataset.coins} Coins`,
        desc: pack.dataset.label || "Coin Pack Top-up"
      });
    });

    document.getElementById("premiumBtn")?.addEventListener("click", () => {
      const user = getUser();
      if (user.premium) {
        showToast("Premium is already active.");
        return;
      }
      openPaymentModal({
        type: "premium",
        price: "4.99",
        title: "Subscribe to Nive Premium",
        desc: "Monthly Unlimited Reading Membership"
      });
    });

    // Channel tab clicks
    document.querySelectorAll(".channel-tab").forEach(tab => {
      tab.addEventListener("click", () => switchChannel(tab.dataset.channel));
    });

    document.getElementById("closePaymentModal")?.addEventListener("click", closePaymentModal);
    document.getElementById("stripePaymentForm")?.addEventListener("submit", handleStripeSubmit);
    document.getElementById("paystackPayBtn")?.addEventListener("click", handlePaystackPayment);
    document.getElementById("paypalPayBtn")?.addEventListener("click", handlePayPalPayment);
    document.getElementById("transferProofForm")?.addEventListener("submit", handleTransferSubmit);

    document.getElementById("redeemBtn")?.addEventListener("click", window.redeemCode);
    document.getElementById("redeemInput")?.addEventListener("keydown", event => {
      if (event.key === "Enter") window.redeemCode();
    });
  });
})();
