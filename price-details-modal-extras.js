/**
 * Stay Awhile — HomeRunner Price Details Modal extras
 *
 * Injects Property name, Dates and Number of nights as a header above the
 * price breakdown inside #homelocal-booking-price-details-modal.
 *
 * Works on BOTH the property page and the checkout page. The modal is the same
 * on both, but the data sources differ, so every getter has a fallback:
 *
 *   Property name : .property-overview .hk-text-bold (checkout)  ->  <h1> (property page)
 *   Dates         : #checkin / #checkout inputs (property page)  ->  widget config (checkout)
 *   Nights        : .total-nights text (property page)           ->  computed from dates
 *
 * Loaded as an EXTERNAL file (enqueued via wp_enqueue_script) so no raw <script>
 * travels through wp-admin, which the Cloudflare WAF on Rocket.net blocks.
 *
 * Data verified on:
 *   - stayawhile.com/property/the-colony-reserve
 *   - stayawhile.com/checkout
 */
(function () {
	"use strict";

	var MODAL_ID   = "homelocal-booking-price-details-modal";
	var OPEN_CLASS = "hk-open";
	var DAY_MS     = 86400000;
	var MONTHS = ["January","February","March","April","May","June",
	              "July","August","September","October","November","December"];

	/* ---------- styles (injected once) ---------- */

	function injectStyles() {
		if (document.getElementById("sa-price-modal-extras-style")) return;
		var css =
			".sa-price-modal-header{margin:0 0 16px;padding:14px 16px;background:#f9f8f8;" +
			"border-left:3px solid #b89535;font-family:'Proxima Nova',sans-serif;}" +
			".sa-price-modal-header .sa-pmh__name{font-size:16px;font-weight:600;color:#181818;" +
			"letter-spacing:.3px;line-height:1.3;}" +
			".sa-price-modal-header .sa-pmh__dates{font-size:13px;color:#555;margin-top:5px;}" +
			".sa-price-modal-header .sa-pmh__nights{font-size:11px;letter-spacing:1.5px;" +
			"text-transform:uppercase;color:#b89535;font-weight:600;margin-top:7px;}";
		var style = document.createElement("style");
		style.id = "sa-price-modal-extras-style";
		style.appendChild(document.createTextNode(css));
		document.head.appendChild(style);
	}

	/* ---------- shared helpers ---------- */

	// HomeRunner pushes each booking widget's settings to this global. On the
	// checkout page the entry carries checkin/checkout (ISO) and the property id.
	function getWidgetConfig() {
		var list = window.homerunner_booking_widget_shortcodes;
		if (list && list.length) {
			for (var i = 0; i < list.length; i++) {
				var c = list[i] && list[i].config;
				if (c && c.checkin && c.checkout) return c;
			}
		}
		return null;
	}

	function readInput(hiddenId, placeholderId) {
		var hidden = document.getElementById(hiddenId);
		if (hidden && hidden.value) return hidden.value;
		var ph = document.getElementById(placeholderId);
		return ph ? ph.value : "";
	}

	// Returns [checkinStr, checkoutStr] from whichever source exists.
	function getCheckInOut() {
		// Property page: live date inputs.
		var ci = readInput("checkin",  "checkin_placeholder");
		var co = readInput("checkout", "checkout_placeholder");
		if (ci && co) return [ci, co];

		// Checkout page: read the dates from the widget config global.
		var cfg = getWidgetConfig();
		if (cfg) return [cfg.checkin, cfg.checkout];

		return ["", ""];
	}

	// Parse component-by-component and build a LOCAL date so an ISO string like
	// "2026-07-20" never shifts a day in negative-UTC timezones.
	function parseDate(str) {
		if (!str) return null;
		str = String(str).trim();
		var m;
		m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);            // YYYY-MM-DD
		if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
		m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);          // MM/DD/YYYY
		if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
		var d = new Date(str);
		if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
		return null;
	}

	/* ---------- data getters ---------- */

	function getPropertyName() {
		// Checkout sidebar shows the name here.
		var co = document.querySelector(".property-overview .hk-text-bold");
		if (co && co.textContent.trim()) return co.textContent.trim();
		// Property page: the page <h1>.
		var h1 = document.querySelector("h1");
		return h1 ? h1.textContent.trim() : "";
	}

	function getDatesText() {
		var pair    = getCheckInOut();
		var inDate  = parseDate(pair[0]);
		var outDate = parseDate(pair[1]);
		if (!inDate || !outDate) return "";

		var sameYear = inDate.getFullYear() === outDate.getFullYear();
		var start = MONTHS[inDate.getMonth()] + " " + inDate.getDate() +
		            (sameYear ? "" : ", " + inDate.getFullYear());
		var end   = MONTHS[outDate.getMonth()] + " " + outDate.getDate() +
		            ", " + outDate.getFullYear();
		return "From " + start + " to " + end; // "From July 20 to July 25, 2026"
	}

	function getNightsText() {
		// Property page exposes a ready-made label ("Total 4 nights").
		var el = document.querySelector(".total-nights");
		if (el && el.textContent.trim()) return el.textContent.trim();

		// Otherwise compute it from the dates (checkout page).
		var pair    = getCheckInOut();
		var inDate  = parseDate(pair[0]);
		var outDate = parseDate(pair[1]);
		if (inDate && outDate) {
			var nights = Math.round((outDate.getTime() - inDate.getTime()) / DAY_MS);
			if (nights > 0) return "Total " + nights + " night" + (nights === 1 ? "" : "s");
		}
		return "";
	}

	/* ---------- injection ---------- */

	function makeLine(cls, text) {
		var d = document.createElement("div");
		d.className = cls;
		d.appendChild(document.createTextNode(text));
		return d;
	}

	function injectHeader(modal) {
		var dialog = modal.querySelector(".hk-modal-dialog");
		if (!dialog) return;

		var name   = getPropertyName();
		var dates  = getDatesText();
		var nights = getNightsText();
		if (!name && !dates && !nights) return; // nothing to show

		var header = document.createElement("div");
		header.className = "sa-price-modal-header";
		if (name)   header.appendChild(makeLine("sa-pmh__name",   name));
		if (dates)  header.appendChild(makeLine("sa-pmh__dates",  dates));
		if (nights) header.appendChild(makeLine("sa-pmh__nights", nights));

		var existing = dialog.querySelector(".sa-price-modal-header");
		if (existing) {
			existing.parentNode.replaceChild(header, existing); // refresh
			return;
		}

		var title = dialog.querySelector(".hk-modal-title");
		if (title) {
			title.insertAdjacentElement("afterend", header);
		} else {
			var content = dialog.querySelector(".hk-widget-content");
			if (content) content.parentNode.insertBefore(header, content);
		}
	}

	/* ---------- watch for the modal opening ---------- */

	function watch(modal) {
		var obs = new MutationObserver(function () {
			if (modal.classList.contains(OPEN_CLASS)) injectHeader(modal);
		});
		obs.observe(modal, { attributes: true, attributeFilter: ["class"] });
		if (modal.classList.contains(OPEN_CLASS)) injectHeader(modal);
	}

	function init(attempt) {
		attempt = attempt || 0;
		var modal = document.getElementById(MODAL_ID);
		if (modal) { injectStyles(); watch(modal); return; }
		if (attempt < 40) setTimeout(function () { init(attempt + 1); }, 500);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () { init(0); });
	} else {
		init(0);
	}
})();
