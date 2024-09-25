const Panel = {
  async init() {
    let { newFeatures, featureRev, } =
      await browser.runtime.sendMessage({ name: "get-feature-rev", });
    if (newFeatures) {
      document.body.setAttribute("has-new-features", featureRev);
      let link = document.getElementById("has-new-features");
      link.href = link.href + "#featureRev-" + featureRev;
      link.textContent = browser.i18n.getMessage("has-new-features");
    }

    window.addEventListener("click", this);
    await this.updatePanel();
  },

  handleEvent(event) {
    switch (event.type) {
    case "click": {
      this.onClick(event);
      break;
    }
    }
  },

  onClick(event) {
    switch (event.target.id) {
    case "has-new-features": {
      browser.tabs.create({
        url: event.target.href,
      });
      browser.runtime.sendMessage({ name: "opened-release-notes", });
      event.preventDefault();
      window.close();
      return false;
    }
    case "refresh": {
      this.refresh();
      return false;
    }
    case "options": {
      browser.runtime.openOptionsPage();
      event.preventDefault();
      window.close();
      return false;
    }
    }
  },

  async refresh() {
    let status = document.getElementById("status");
    status.textContent = "Refreshing...";

    let refreshPromise = browser.runtime.sendMessage({ name: "refresh", });
    let visualDelayPromise = new Promise(resolve => setTimeout(resolve, 250));
    await Promise.all([refreshPromise, visualDelayPromise,]);

    await this.updatePanel();
  },

  async updatePanel() {
    let states = await browser.runtime.sendMessage({ name: "get-states", });
    let total = 0;
    for (let [, state,] of states) {
      switch (state.type) {
      case "bugzilla": {
        let serviceTotal = 0;
        if (state.data.reviewTotal) {
          serviceTotal += state.data.reviewTotal;
        }
        if (state.data.needinfoTotal) {
          serviceTotal += state.data.needinfoTotal;
        }

        document.body.setAttribute("total-bugzilla-reviews",
          state.data.reviewTotal || 0);
        document.body.setAttribute("total-bugzilla-needinfos",
          state.data.needinfoTotal || 0);
        document.querySelector("#bugzilla-needinfos a").textContent =
          browser.i18n.getMessage("bugzilla-needinfos",
            { num: state.data.needinfoTotal || 0 });
        document.querySelector("#bugzilla-reviews a").textContent =
          browser.i18n.getMessage("bugzilla-reviews",
            { num: state.data.reviewTotal || 0 });

        total += serviceTotal;
        break;
      }
      case "phabricator": {
        // If Phabricator is disabled, well, just skip.
        if (state.data.disabled) {
          continue;
        }

        let phabDisconnected =
          document.getElementById("phabricator-disconnected");
        if (!state.data.connected) {
          phabDisconnected.textContent =
            browser.i18n.getMessage("phabricator-disconnected");
          phabDisconnected.classList.remove("hidden");
        } else {
          phabDisconnected.classList.add("hidden");
        }

        let serviceUserTotal = state.data.userReviewTotal || 0;

        document.body.setAttribute("total-phabricator-user-reviews",
          serviceUserTotal);
        document.querySelector("#phabricator-user-reviews a").textContent =
          browser.i18n.getMessage("phabricator-user-reviews",
            { num: serviceUserTotal });

        let serviceGroupTotal = state.data.groupReviewTotal || 0;

        document.body.setAttribute("total-phabricator-group-reviews",
          serviceGroupTotal);
        document.querySelector("#phabricator-group-reviews a").textContent =
          browser.i18n.getMessage(
            "phabricator-group-reviews", { num: serviceGroupTotal });
        document.getElementById("phabricator-group-reviews").hidden =
          serviceGroupTotal == 0;

        let serviceTotal = state.data.reviewTotal || 0;
        total += serviceTotal;
        break;
      }
      case "github": {
        let serviceTotal = state.data.reviewTotal || 0;
        let reviewUrl = state.data.reviewUrl ||
          "https://github.com/pulls/review-requested";
        document.body.setAttribute("total-github-reviews",
          serviceTotal || 0);
        let link = document.getElementById("github-review-link");
        link.href = reviewUrl;
        link.textContent =
          browser.i18n.getMessage("github-reviews", { num: serviceTotal });

        total += serviceTotal;
        break;
      }
      }
    }

    document.getElementById("status").textContent =
      browser.i18n.getMessage("status", { total });
  },
};

addEventListener("DOMContentLoaded", () => {
  Panel.init();
}, { once: true, });
