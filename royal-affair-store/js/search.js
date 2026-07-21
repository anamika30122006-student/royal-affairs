/* Complete Instant Search with Autocomplete & Keyboard Navigation */

document.addEventListener("DOMContentLoaded", () => {
  initSearchSystem();
});

let activeSuggestionIndex = -1;
let searchMatches = [];

function initSearchSystem() {
  const searchInputs = document.querySelectorAll(".header-search-input");
  
  searchInputs.forEach(input => {
    const parentContainer = input.closest(".header-search-bar, .mobile-search-wrapper");
    if (!parentContainer) return;
    
    const dropdown = parentContainer.querySelector(".search-suggestions-dropdown");
    if (!dropdown) return;

    // 1. Debounced live search
    const performSearch = debounce((query) => {
      query = query.trim().toLowerCase();
      activeSuggestionIndex = -1;

      if (query.length < 2) {
        if (query.length === 0) {
          showSuggestionsDefault(dropdown);
        } else {
          dropdown.innerHTML = "";
          dropdown.style.display = "none";
        }
        return;
      }

      // Filter by name, category, fabric, occasion, and description
      searchMatches = typeof products !== "undefined" ? products.filter(prod => 
        prod.name.toLowerCase().includes(query) || 
        prod.category.toLowerCase().includes(query) || 
        (prod.fabric && prod.fabric.toLowerCase().includes(query)) ||
        (prod.occasion && prod.occasion.toLowerCase().includes(query)) ||
        (prod.shortDescription && prod.shortDescription.toLowerCase().includes(query)) ||
        (prod.fullDescription && prod.fullDescription.toLowerCase().includes(query))
      ) : [];

      renderSuggestions(dropdown, query);
    }, 250);

    input.addEventListener("input", (e) => {
      performSearch(e.target.value);
    });

    // 2. Focus events
    input.addEventListener("focus", () => {
      const val = input.value.trim();
      if (val.length === 0) {
        showSuggestionsDefault(dropdown);
      } else if (val.length >= 2) {
        performSearch(val);
      }
    });

    // 3. Keyboard Navigation and Enter Submit
    input.addEventListener("keydown", (e) => {
      const rows = dropdown.querySelectorAll(".search-result-row");
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (rows.length === 0) return;
        activeSuggestionIndex++;
        if (activeSuggestionIndex >= rows.length) activeSuggestionIndex = 0;
        highlightSuggestionRow(rows);
      } 
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (rows.length === 0) return;
        activeSuggestionIndex--;
        if (activeSuggestionIndex < 0) activeSuggestionIndex = rows.length - 1;
        highlightSuggestionRow(rows);
      } 
      else if (e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestionIndex > -1 && rows[activeSuggestionIndex]) {
          // If suggestion highlighted, navigate to it
          const link = rows[activeSuggestionIndex].getAttribute("href");
          const text = rows[activeSuggestionIndex].querySelector("h5").textContent;
          saveRecentSearch(text);
          window.location.href = link;
        } else {
          // Normal keyword submission
          const term = input.value.trim();
          if (term.length > 0) {
            saveRecentSearch(term);
            window.location.href = `shop.html?search=${encodeURIComponent(term)}`;
          }
        }
      }
    });
  });

  // 4. Close dropdown on clicking outside
  document.addEventListener("click", (e) => {
    const activeInput = document.activeElement;
    const isClickInsideInput = activeInput && activeInput.classList.contains("header-search-input") && activeInput.contains(e.target);
    
    if (!e.target.closest(".header-search-bar") && !e.target.closest(".mobile-search-wrapper")) {
      const dropdowns = document.querySelectorAll(".search-suggestions-dropdown");
      dropdowns.forEach(d => {
        d.style.display = "none";
      });
    }
  });
}

// 5. Debounce timer
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// 6. Highlight active item
function highlightSuggestionRow(rows) {
  rows.forEach((row, idx) => {
    if (idx === activeSuggestionIndex) {
      row.style.backgroundColor = "var(--color-beige)";
      row.style.borderLeft = "3px solid var(--color-maroon)";
      row.focus();
    } else {
      row.style.backgroundColor = "var(--color-white)";
      row.style.borderLeft = "3px solid transparent";
    }
  });
}

// 7. Recent & Popular default state
function showSuggestionsDefault(dropdown) {
  const recent = JSON.parse(localStorage.getItem("royal_affair_recent_searches")) || [];
  const popular = ["Velvet Anarkali", "Silk Sharara", "Cotton Lawn", "Wedding Couture", "Festive Suit", "Meher"];

  let html = `
    <div style="padding: 1rem; text-align: left; background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-top: none; box-shadow: var(--shadow-md);">
  `;

  if (recent.length > 0) {
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h6 style="margin: 0; font-size: var(--font-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-gray); font-weight: 600;">Recent Searches</h6>
        <button onclick="clearRecentSearchHistory(event)" style="background: none; border: none; font-size: 0.75rem; color: var(--color-maroon); cursor: pointer; text-decoration: underline; font-weight: 500;">Clear</button>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1.25rem;">
        ${recent.map(term => `
          <button class="recent-search-chip" onclick="triggerSearchTerm('${term}')" style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); padding: 4px 10px; font-size: var(--font-xs); color: var(--color-charcoal); cursor: pointer; transition: all var(--transition-fast);">${term}</button>
        `).join("")}
      </div>
    `;
  }

  html += `
      <h6 style="margin: 0 0 0.75rem 0; font-size: var(--font-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-gray); font-weight: 600;">Popular Searches</h6>
      <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
        ${popular.map(term => `
          <button class="popular-search-chip" onclick="triggerSearchTerm('${term}')" style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); padding: 4px 10px; font-size: var(--font-xs); color: var(--color-charcoal); cursor: pointer; transition: all var(--transition-fast);">${term}</button>
        `).join("")}
      </div>
    </div>
  `;

  dropdown.innerHTML = html;
  dropdown.style.display = "block";
}

// 8. Render search predictions
function renderSuggestions(dropdown, query) {
  if (searchMatches.length === 0) {
    dropdown.innerHTML = `
      <div style="padding: 1rem 1.5rem; font-size: 0.9rem; text-align: center; color: var(--color-gray); background-color: var(--color-white); border: 1px solid var(--color-gray-light); box-shadow: var(--shadow-md);">
        No designer suits found matching "<strong>${query}</strong>".
      </div>
    `;
    dropdown.style.display = "block";
    return;
  }

  let html = `
    <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-top: none; box-shadow: var(--shadow-md); text-align: left;">
      <div style="padding: 0.5rem 1.25rem; background-color: var(--color-ivory); border-bottom: 1px solid var(--color-gray-light); display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--color-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
        <span>Suggestions</span>
        <span>${searchMatches.length} matches found</span>
      </div>
  `;

  // Render first 5 items
  searchMatches.slice(0, 5).forEach(prod => {
    const displayPrice = typeof formatCurrency === "function" ? formatCurrency(prod.price) : "₹" + prod.price;
    const highlightedName = highlightQueryMatch(prod.name, query);
    const highlightedCat = highlightQueryMatch(prod.category, query);

    html += `
      <a href="product.html?id=${prod.id}" class="search-result-row" onclick="saveRecentSearch('${prod.name}')" style="text-decoration: none; display: flex; align-items: center; padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--color-gray-light); border-left: 3px solid transparent; transition: all var(--transition-fast);">
        <img src="${prod.images[0]}" alt="${prod.name}" style="width: 40px; height: 52px; object-fit: cover; border-radius: var(--border-radius-xs); margin-right: 1rem; border: 1px solid var(--color-gray-light);">
        <div style="flex: 1;">
          <h5 style="margin: 0 0 2px 0; font-family: var(--font-body); font-size: var(--font-sm); color: var(--color-charcoal); font-weight: 500;">${highlightedName}</h5>
          <p style="margin: 0; font-size: var(--font-xs); color: var(--color-gold-dark); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">${highlightedCat}</p>
        </div>
        <span style="font-size: var(--font-sm); color: var(--color-maroon); font-weight: 600;">${displayPrice}</span>
      </a>
    `;
  });

  // If more than 5 results, add see all row
  if (searchMatches.length > 5) {
    html += `
      <a href="shop.html?search=${encodeURIComponent(query)}" onclick="saveRecentSearch('${query}')" style="display: block; padding: 0.75rem 1.25rem; text-align: center; font-size: var(--font-xs); color: var(--color-maroon); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background-color: var(--color-ivory);">
        See All Matches (${searchMatches.length}) &rarr;
      </a>
    `;
  }

  html += `</div>`;
  dropdown.innerHTML = html;
  dropdown.style.display = "block";
}

// 9. Match highlighter
function highlightQueryMatch(text, query) {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return text.replace(regex, `<mark style="background-color: var(--color-beige); color: var(--color-maroon-dark); font-weight: 600; padding: 0 2px; border-radius: var(--border-radius-xs);">$1</mark>`);
}

// 10. LocalStorage Recents Manager
function saveRecentSearch(term) {
  if (!term) return;
  const cleaned = term.trim();
  if (cleaned.length === 0) return;
  
  let recent = JSON.parse(localStorage.getItem("royal_affair_recent_searches")) || [];
  recent = recent.filter(t => t.toLowerCase() !== cleaned.toLowerCase());
  recent.unshift(cleaned);
  if (recent.length > 5) recent.pop();
  localStorage.setItem("royal_affair_recent_searches", JSON.stringify(recent));
}

window.clearRecentSearchHistory = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  localStorage.removeItem("royal_affair_recent_searches");
  
  const dropdowns = document.querySelectorAll(".search-suggestions-dropdown");
  dropdowns.forEach(d => {
    if (d.style.display === "block" || d.parentElement.contains(document.activeElement)) {
      showSuggestionsDefault(d);
    }
  });
};

window.triggerSearchTerm = function(term) {
  saveRecentSearch(term);
  window.location.href = `shop.html?search=${encodeURIComponent(term)}`;
};
