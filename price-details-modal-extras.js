/**
 * Stay Awhile — HomeRunner Price Details Modal extras
 *
 * Injects Property name, Dates and Number of nights as a header above the
 * price breakdown inside #homelocal-booking-price-details-modal.
 *
 * Loaded as an EXTERNAL file (enqueued from a tiny Code Snippets PHP) so the
 * raw <script> never travels in the snippet-save POST body — that is what was
 * tripping the Cloudflare WAF on Rocket.net. The CSS is injected from here too,
 * keeping the PHP snippet free of anything the firewall could flag.
 *
 * Data sources (verified on stayawhile.com/property/the-colony-reserve):
 *   - Property name : page <h1>            ("The Colony Reserve")
 *   - Nights        : .total-nights text   ("Total 4 nights")
 *   - Dates         : #checkin / #checkout  (ISO, e.g. 2026-06-15)
 */
(function () {
	"use strict";

	var MODAL_ID   = "homelocal-booking-price-details-modal";
	var OPEN_CLASS = "hk-open";
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

	/* ---------- data getters ---------- */

	function getPropertyName() {
		var h1 = document.querySelector("h1");
		return h1 ? h1.textContent.trim() : "";
	}

	function getNightsText() {
		// HomeRunner already renders e.g. "Total 4 nights" — exactly the
		// wording requested, so we reuse it verbatim.
		var el = document.querySelector(".total-nights");
		return el ? el.textContent.trim() : "";
	}

	// Parse component-by-component and build a LOCAL date, so an ISO string
	// like "2026-06-15" never shifts a day in negative-UTC timezones.
	function parseDate(str) {
		if (!str) return null;
		str = String(str).trim();
		var m;

		// YYYY-MM-DD  (HomeRunner's hidden-input format)
		m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
		if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

		// MM/DD/YYYY  (US format, fallback)
		m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
		if (m) return new Date(+m[3], +m[1] - 1, +m[2]);

		// Last resort: let the engine try, then strip to a local date-only value.
		var d = new Date(str);
		if (!isNaN(d.getTime())) {
			return new Date(d.getFullYear(), d.getMonth(), d.getDate());
		}
		return null;
	}

	function readInput(hiddenId, placeholderId) {
		var hidden = document.getElementById(hiddenId);
		if (hidden && hidden.value) return hidden.value;
		var ph = document.getElementById(placeholderId);
		return ph ? ph.value : "";
	}

	function getDatesText() {
		var inDate  = parseDate(readInput("checkin",  "checkin_placeholder"));
		var outDate = parseDate(readInput("checkout", "checkout_placeholder"));
		if (!inDate || !outDate) return "";

		var sameYear = inDate.getFullYear() === outDate.getFullYear();
		var start = MONTHS[inDate.getMonth()] + " " + inDate.getDate() +
		            (sameYear ? "" : ", " + inDate.getFullYear());
		var end   = MONTHS[outDate.getMonth()] + " " + outDate.getDate() +
		            ", " + outDate.getFullYear();

		// "From June 15 to June 19, 2026"
		return "From " + start + " to " + end;
	}

	/* ---------- injection ---------- */

	function buildInner() {
		var name   = getPropertyName();
		var dates  = getDatesText();
		var nights = getNightsText();

		var html = "";
		if (name)   html += '<div class="sa-pmh__name">'   + name   + "</div>";
		if (dates)  html += '<div class="sa-pmh__dates">'  + dates  + "</div>";
		if (nights) html += '<div class="sa-pmh__nights">' + nights + "</div>";
		return html;
	}

	function injectHeader(modal) {
		var dialog = modal.querySelector(".hk-modal-dialog");
		if (!dialog) return;

		var inner = buildInner();
		if (!inner) return; // nothing to show

		var header = dialog.querySelector(".sa-price-modal-header");
		if (header) {
			header.innerHTML = inner; // refresh in place
			return;
		}

		header = document.createElement("div");
		header.className = "sa-price-modal-header";
		header.innerHTML = inner;

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
			if (modal.classList.contains(OPEN_CLASS)) {
				injectHeader(modal);
			}
		});
		obs.observe(modal, { attributes: true, attributeFilter: ["class"] });

		// In case it is already open when we attach.
		if (modal.classList.contains(OPEN_CLASS)) {
			injectHeader(modal);
		}
	}

	// The modal node may be added to the DOM after page load by HomeRunner,
	// so wait for it to exist before attaching the observer.
	function init(attempt) {
		attempt = attempt || 0;
		var modal = document.getElementById(MODAL_ID);
		if (modal) {
			injectStyles();
			watch(modal);
			return;
		}
		if (attempt < 40) { // ~20s of retries, then give up quietly
			setTimeout(function () { init(attempt + 1); }, 500);
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () { init(0); });
	} else {
		init(0);
	}
})();
