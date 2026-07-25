// --- FIREBASE CONFIGURATION & INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCZvJC6xQkhuM7MkybSwn7FqW5W-ByTKFk",
  authDomain: "lurova-account.firebaseapp.com",
  projectId: "lurova-account",
  storageBucket: "lurova-account.firebasestorage.app",
  messagingSenderId: "925302881748",
  appId: "1:925302881748:web:da8f9f6b298e27b758ea41"
};

// Initialize Firebase App & Auth Service
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Central Account Portal Redirect URL
const ACCOUNT_URL = "https://account.lurova.life";

// Global App State & Gateway Configuration
const RAZORPAY_KEY_ID = 'rzp_live_S4aoxO09BneiJ3';

let activeUser = null;
let currentPlatform = null;
let currentPlan = null;
let campaignFormValues = {};
let uploadedFile = null;
let userCampaigns = [];
let isInfluencerFlow = false;

// Country to State Database Mapping
const countryStateMap = {
  "India": ["Andhra Pradesh", "Delhi NCR", "Gujarat", "Karnataka", "Maharashtra", "Punjab", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"],
  "United States": ["California", "Florida", "Illinois", "New York", "Texas", "Washington"],
  "United Kingdom": ["England", "Northern Ireland", "Scotland", "Wales"],
  "United Arab Emirates": ["Abu Dhabi", "Dubai", "Sharjah", "Ajman"],
  "Australia": ["New South Wales", "Queensland", "South Australia", "Victoria", "Western Australia"],
  "Canada": ["Alberta", "British Columbia", "Ontario", "Quebec"]
};

// Platform Catalogue
const platforms = [
  { id: 'meta', name: 'Meta Ads (FB & Insta)', icon: 'fa-brands fa-meta', desc: 'Feed, Reels & Story campaigns.' },
  { id: 'google', name: 'Google Ads', icon: 'fa-brands fa-google', desc: 'Search, Display & Shopping ads.' },
  { id: 'youtube', name: 'YouTube Video Ads', icon: 'fa-brands fa-youtube', desc: 'Skippable & Bumper video ads.' },
  { id: 'tiktok', name: 'TikTok Ads', icon: 'fa-brands fa-tiktok', desc: 'Short-form video reach.', disabled: true, note: 'Banned in India' },
  { id: 'jio', name: 'JioCinema / Hotstar', icon: 'fa-solid fa-tv', desc: 'Sports & OTT stream ads.' },
  { id: 'netflix', name: 'Netflix Ads', icon: 'fa-solid fa-film', desc: 'Premium stream placement.' },
  { id: 'prime', name: 'Amazon Prime Ads', icon: 'fa-brands fa-amazon', desc: 'OTT Video stream ads.' },
  { id: 'zomato', name: 'Zomato Ads', icon: 'fa-solid fa-utensils', desc: 'Food delivery search placement.' },
  { id: 'swiggy', name: 'Swiggy Ads', icon: 'fa-solid fa-burger', desc: 'In-app food & instamart banners.' },
  { id: 'blinkit', name: 'Blinkit Ads', icon: 'fa-solid fa-bolt-lightning', desc: 'Quick-commerce sponsored listings.' },
  { id: 'zepto', name: 'Zepto Ads', icon: 'fa-solid fa-box-open', desc: '10-minute grocery ad banners.' },
  { id: 'uber', name: 'Uber Ads', icon: 'fa-solid fa-car', desc: 'Ridership in-app screen ads.' },
  { id: 'newspaper', name: 'Newspaper Ads', icon: 'fa-solid fa-newspaper', desc: 'Print & Classified publications.' },
  { id: 'influencer', name: 'Influencer Marketing', icon: 'fa-solid fa-users-viewfinder', desc: 'Dedicated creator deals starting ₹4,999.', customFlow: true },
  { id: 'apple', name: 'Apple Search Ads', icon: 'fa-brands fa-apple', desc: 'App Store search monetization.' },
  { id: 'tv', name: 'TV Broadcasting', icon: 'fa-solid fa-tower-broadcast', desc: 'National & regional TV slots.' },
  { id: 'billboard', name: 'Digital Billboards', icon: 'fa-solid fa-rectangle-ad', desc: 'High-visibility LED outdoor screens.' }
];

// 6 Tier Standard Plans
const sixPlanOptions = [
  { id: 'p1', name: 'Micro Boost', basePrice: 499, leads: '200 - 500', days: 3 },
  { id: 'p2', name: 'Starter Launch', basePrice: 999, leads: '500 - 1,200', days: 5 },
  { id: 'p3', name: 'Growth Accelerator', basePrice: 2999, leads: '2,000 - 4,500', days: 10 },
  { id: 'p4', name: 'Business Pro', basePrice: 9999, leads: '7,500 - 15,000', days: 20 },
  { id: 'p5', name: 'Enterprise Scale', basePrice: 29999, leads: '25,000 - 60,000', days: 30 },
  { id: 'p6', name: 'Dominator VIP', basePrice: 49999, leads: '100,000+ Reach', days: 45 }
];

// Redirect to Central Account Portal with return parameter
function redirectToAccount() {
  const currentUrl = encodeURIComponent(window.location.origin + window.location.pathname);
  window.location.href = `${ACCOUNT_URL}/?redirect_to=${currentUrl}`;
}

// Check for user data passed back from account portal in URL parameters
function checkUrlForUserSession() {
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user');
  
  if (userParam) {
    try {
      const userData = JSON.parse(decodeURIComponent(userParam));
      localStorage.setItem('lurova_active_user', JSON.stringify(userData));
      activeUser = userData;
      updateUserNav();
      
      // Clean URL parameters without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.error("Error parsing user session parameter:", e);
    }
  } else {
    // Try restoring from local storage backup
    const savedUser = localStorage.getItem('lurova_active_user');
    if (savedUser) {
      try {
        activeUser = JSON.parse(savedUser);
        updateUserNav();
      } catch (e) {
        localStorage.removeItem('lurova_active_user');
      }
    }
  }
}

// --- REAL-TIME FIREBASE AUTHENTICATION LISTENER ---
auth.onAuthStateChanged(user => {
  if (user) {
    activeUser = {
      uid: user.uid,
      email: user.email,
      firstName: user.displayName ? user.displayName.split(' ')[0] : 'Account',
      lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
      phone: user.phoneNumber || ''
    };
    localStorage.setItem('lurova_active_user', JSON.stringify(activeUser));
    updateUserNav();
  } else if (!localStorage.getItem('lurova_active_user')) {
    activeUser = null;
    resetUserNav();
  }
});

// Mobile Navigation Drawer Handlers
function toggleMobileMenu() {
  document.getElementById('nav-menu').classList.toggle('open');
}

function closeMobileMenu() {
  document.getElementById('nav-menu').classList.remove('open');
}

// Toggle Profile Dropdown
function toggleProfileDropdown(dropdownId) {
  const menu = document.getElementById(dropdownId);
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// Close dropdown when clicking anywhere outside
document.addEventListener('click', function(event) {
  const dropdowns = document.querySelectorAll('.profile-dropdown-menu');
  dropdowns.forEach(menu => {
    if (!menu.contains(event.target) && !event.target.closest('.user-menu-wrapper')) {
      menu.classList.add('hidden');
    }
  });
});

// Navigation & Auth Guards
function navigateTo(viewId) {
  document.querySelectorAll('.page-view').forEach(view => view.classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');
  window.scrollTo(0, 0);
}

function scrollToSection(sectionId) {
  navigateTo('view-home');
  setTimeout(() => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

function requireAuth(targetView) {
  if (!activeUser) {
    alert("Please log in via account.lurova.life first.");
    redirectToAccount();
    return false;
  }
  if (targetView === 'view-progress-studio') renderStudio();
  navigateTo(targetView);
  return true;
}

function handleGetStarted() {
  renderPlatforms();
  navigateTo('view-platforms');
}

function startCampaignWith(platformId) {
  const p = platforms.find(item => item.id === platformId);
  if (p) choosePlatform(p.id, p.name);
}

// UI Navbar Updates for Logged-In User
function updateUserNav() {
  const desktopArea = document.getElementById('nav-user-area');
  const mobileArea = document.getElementById('mobile-nav-user-area');

  const authMarkup = `
    <div class="user-menu-wrapper">
      <button class="btn btn-secondary" onclick="toggleProfileDropdown('desktop-profile-menu')">
        <i class="fa-solid fa-circle-user"></i> ${activeUser.firstName} <i class="fa-solid fa-chevron-down" style="font-size:0.75rem; margin-left:4px;"></i>
      </button>
      <div id="desktop-profile-menu" class="profile-dropdown-menu hidden">
        <button class="dropdown-item" onclick="redirectToAccount()">
          <i class="fa-solid fa-user-gear"></i> View Profile
        </button>
        <button class="dropdown-item danger-text" onclick="logout()">
          <i class="fa-solid fa-power-off"></i> Logout
        </button>
      </div>
    </div>
  `;

  const mobileAuthMarkup = `
    <div class="user-menu-wrapper" style="width:100%;">
      <button class="btn btn-secondary" style="width:100%; justify-content:space-between;" onclick="toggleProfileDropdown('mobile-profile-menu')">
        <span><i class="fa-solid fa-circle-user"></i> ${activeUser.firstName}</span>
        <i class="fa-solid fa-chevron-down" style="font-size:0.75rem;"></i>
      </button>
      <div id="mobile-profile-menu" class="profile-dropdown-menu hidden" style="position:static; width:100%; margin-top:6px;">
        <button class="dropdown-item" onclick="redirectToAccount()">
          <i class="fa-solid fa-user-gear"></i> View Profile
        </button>
        <button class="dropdown-item danger-text" onclick="logout()">
          <i class="fa-solid fa-power-off"></i> Logout
        </button>
      </div>
    </div>
  `;

  if (desktopArea) desktopArea.innerHTML = authMarkup;
  if (mobileArea) mobileArea.innerHTML = mobileAuthMarkup;
}

// UI Navbar Reset for Logged-Out Guest
function resetUserNav() {
  const desktopArea = document.getElementById('nav-user-area');
  const mobileArea = document.getElementById('mobile-nav-user-area');

  const defaultMarkup = `
    <button class="btn btn-primary" onclick="redirectToAccount()"><i class="fa-solid fa-right-to-bracket"></i> Login / Sign Up</button>
  `;

  if (desktopArea) desktopArea.innerHTML = defaultMarkup;
  if (mobileArea) mobileArea.innerHTML = defaultMarkup;
}

function logout() {
  localStorage.removeItem('lurova_active_user');
  auth.signOut().then(() => {
    alert('Logged out successfully.');
    resetUserNav();
    navigateTo('view-home');
  });
}

// PLATFORMS & PLANS RENDERER
function renderPlatforms() {
  const grid = document.getElementById('platform-grid');
  const homeGrid = document.getElementById('home-services-grid');

  const cardsHtml = platforms.map(p => {
    if (p.disabled) {
      return `
        <div class="platform-card disabled-card">
          <div class="platform-icon-wrap"><i class="${p.icon}"></i></div>
          <h3>${p.name}</h3>
          <p style="font-size:0.75rem; color:var(--muted);">${p.desc}</p>
          <span class="ban-badge"><i class="fa-solid fa-ban"></i> ${p.note}</span>
        </div>
      `;
    }
    return `
      <div class="platform-card" onclick="choosePlatform('${p.id}', '${p.name}')">
        <div class="platform-icon-wrap"><i class="${p.icon}"></i></div>
        <h3>${p.name}</h3>
        <p style="font-size:0.75rem; color:var(--muted);">${p.desc}</p>
      </div>
    `;
  }).join('');

  grid.innerHTML = cardsHtml;

  if (homeGrid) {
    homeGrid.innerHTML = platforms.slice(0, 9).map(p => `
      <div class="service-card ${p.disabled ? 'disabled-card' : ''}" onclick="${p.disabled ? '' : `choosePlatform('${p.id}', '${p.name}')`}">
        <i class="${p.icon} service-icon"></i>
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        ${p.disabled ? `<span class="ban-badge">${p.note}</span>` : `<span class="service-link">Launch Campaign &rarr;</span>`}
      </div>
    `).join('');
  }
}

function choosePlatform(id, name) {
  const pObj = platforms.find(p => p.id === id);
  if (pObj && pObj.disabled) {
    alert("This platform is currently unavailable or banned in your region.");
    return;
  }

  currentPlatform = { id, name };
  document.getElementById('selected-platform-title').innerText = name;

  const plansGrid = document.getElementById('plans-grid');
  const influencerCard = document.getElementById('influencer-custom-card');
  const subtitleText = document.getElementById('plans-subtitle-text');

  if (id === 'influencer') {
    isInfluencerFlow = true;
    plansGrid.classList.add('hidden');
    influencerCard.classList.remove('hidden');
    subtitleText.innerText = 'Influencer Marketing involves custom creator matching and direct negotiation.';
  } else {
    isInfluencerFlow = false;
    influencerCard.classList.add('hidden');
    plansGrid.classList.remove('hidden');
    subtitleText.innerText = 'Choose from 6 transparent budget packages with 15% automatic discount.';
    render6Plans();
  }

  navigateTo('view-plans');
}

function render6Plans() {
  const grid = document.getElementById('plans-grid');
  grid.innerHTML = sixPlanOptions.map(plan => {
    const discountedPrice = Math.round(plan.basePrice * 0.85);
    return `
      <div class="plan-card" onclick="choosePlan('${plan.name}', ${plan.basePrice}, ${discountedPrice}, '${plan.leads}', ${plan.days})">
        <h3>${plan.name}</h3>
        <p><strong>${plan.leads}</strong> Est. Scope</p>
        <p><strong>${plan.days} Days</strong> Duration</p>
        <div style="margin-top: 1rem;">
          <span class="strikethrough">₹${plan.basePrice}</span>
          <h2 class="gradient-text">₹${discountedPrice}</h2>
          <small style="color: green; font-weight: bold;">(15% OFF)</small>
        </div>
      </div>
    `;
  }).join('');
}

function choosePlan(name, originalPrice, finalPrice, leads, days) {
  currentPlan = { name, originalPrice, finalPrice, leads, days };
  if (requireAuth('view-details')) {
    navigateTo('view-details');
  }
}

function proceedToInfluencerPayment() {
  if (!requireAuth('view-payment')) return;

  currentPlan = {
    name: 'Influencer Consultation & Agent Fee',
    originalPrice: 399,
    finalPrice: 339,
    leads: 'Custom Creator Network',
    days: 30
  };

  campaignFormValues = {
    brand: (activeUser ? activeUser.firstName : 'User') + "'s Brand",
    name: 'Influencer Marketing Consultation',
    country: 'India',
    states: ['All States'],
    cta: 'AGENT ASSIGNED'
  };

  document.getElementById('summary-brand').innerText = campaignFormValues.brand;
  document.getElementById('summary-platform').innerText = currentPlatform.name;
  document.getElementById('summary-plan').innerText = currentPlan.name;
  document.getElementById('summary-leads').innerText = 'Custom Creator Tiers';
  document.getElementById('summary-region').innerText = 'Flexible / Dedicated Agent';
  document.getElementById('summary-cta').innerText = campaignFormValues.cta;
  document.getElementById('summary-original-price').innerText = `₹399`;
  document.getElementById('summary-final-price').innerText = `₹339`;

  document.getElementById('payment-back-btn').onclick = () => navigateTo('view-plans');

  navigateTo('view-payment');
}

// CAMPAIGN FORM HANDLERS
function handleIndustryChange() {
  const select = document.getElementById('campaign-industry');
  const customGroup = document.getElementById('custom-industry-group');
  if (select.value === 'OTHER') {
    customGroup.classList.remove('hidden');
    document.getElementById('campaign-custom-industry').setAttribute('required', 'true');
  } else {
    customGroup.classList.add('hidden');
    document.getElementById('campaign-custom-industry').removeAttribute('required');
  }
}

function handleCountryChange() {
  const countrySelect = document.getElementById('campaign-country').value;
  const stateSelect = document.getElementById('campaign-states');
  stateSelect.innerHTML = '';

  if (countryStateMap[countrySelect]) {
    countryStateMap[countrySelect].forEach(st => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.innerText = st;
      stateSelect.appendChild(opt);
    });
  } else {
    stateSelect.innerHTML = `<option value="" disabled>Select valid country first</option>`;
  }
}

function toggleSelectAllStates() {
  const stateSelect = document.getElementById('campaign-states');
  let allSelected = Array.from(stateSelect.options).every(opt => opt.selected);
  Array.from(stateSelect.options).forEach(opt => opt.selected = !allSelected);
}

function handleCTAChange() {
  const ctaVal = document.getElementById('campaign-cta').value;
  const contactGroup = document.getElementById('contact-number-group');
  if (ctaVal === 'CONTACT_US') {
    contactGroup.classList.remove('hidden');
    document.getElementById('campaign-contact-number').setAttribute('required', 'true');
  } else {
    contactGroup.classList.add('hidden');
    document.getElementById('campaign-contact-number').removeAttribute('required');
  }
}

document.getElementById('campaign-details-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const selectedStates = Array.from(document.getElementById('campaign-states').selectedOptions).map(o => o.value);
  if (selectedStates.length === 0) {
    alert("Please select at least one targeted state!");
    return;
  }

  campaignFormValues = {
    name: document.getElementById('campaign-name').value,
    brand: document.getElementById('campaign-brand').value,
    industry: document.getElementById('campaign-industry').value === 'OTHER' 
      ? document.getElementById('campaign-custom-industry').value 
      : document.getElementById('campaign-industry').value,
    age: document.getElementById('campaign-age').value,
    country: document.getElementById('campaign-country').value,
    states: selectedStates,
    cta: document.getElementById('campaign-cta').value,
    link: document.getElementById('campaign-link').value,
    contactNumber: document.getElementById('campaign-contact-number').value || 'N/A',
    shortDesc: document.getElementById('campaign-short-desc').value,
    longDesc: document.getElementById('campaign-long-desc').value || 'None',
    tags: document.getElementById('campaign-tags').value || 'None'
  };

  navigateTo('view-upload');
});

// MEDIA UPLOAD
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', function () {
  if (this.files && this.files[0]) handleFileUpload(this.files[0]);
});

function handleFileUpload(file) {
  const progressContainer = document.getElementById('upload-progress-container');
  const progressBar = document.getElementById('progress-bar-fill');
  const uploadBox = document.getElementById('upload-box');

  uploadBox.classList.add('hidden');
  progressContainer.classList.remove('hidden');

  let progress = 0;
  const interval = setInterval(() => {
    progress += 15;
    progressBar.style.width = progress + '%';

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        progressContainer.classList.add('hidden');
        uploadedFile = file;
        showFileCard(file.name, (file.size / (1024 * 1024)).toFixed(2) + ' MB');
      }, 300);
    }
  }, 100);
}

function showFileCard(name, size) {
  document.getElementById('file-name-display').innerText = name;
  document.getElementById('file-size-display').innerText = size;
  document.getElementById('file-details-card').classList.remove('hidden');
  document.getElementById('continue-to-payment-btn').removeAttribute('disabled');
}

function removeFile() {
  uploadedFile = null;
  fileInput.value = '';
  document.getElementById('file-details-card').classList.add('hidden');
  document.getElementById('upload-box').classList.remove('hidden');
  document.getElementById('continue-to-payment-btn').setAttribute('disabled', 'true');
}

function reuploadFile() {
  removeFile();
  fileInput.click();
}

// CHECKOUT & RAZORPAY INTEGRATION
function showCheckoutScreen() {
  document.getElementById('summary-brand').innerText = campaignFormValues.brand;
  document.getElementById('summary-platform').innerText = currentPlatform.name;
  document.getElementById('summary-plan').innerText = currentPlan.name;
  document.getElementById('summary-leads').innerText = currentPlan.leads;
  document.getElementById('summary-region').innerText = `${campaignFormValues.country} (${campaignFormValues.states.length} States)`;
  document.getElementById('summary-cta').innerText = campaignFormValues.cta;
  document.getElementById('summary-original-price').innerText = `₹${currentPlan.originalPrice}`;
  document.getElementById('summary-final-price').innerText = `₹${currentPlan.finalPrice}`;

  document.getElementById('payment-back-btn').onclick = () => navigateTo('view-upload');

  navigateTo('view-payment');
}

function triggerRazorpayPayment() {
  const amountInPaise = currentPlan.finalPrice * 100;

  const options = {
    "key": RAZORPAY_KEY_ID,
    "amount": amountInPaise,
    "currency": "INR",
    "name": "LUROVA Ads",
    "description": isInfluencerFlow ? "Influencer Agent Meeting Fee" : `Campaign: ${campaignFormValues.name}`,
    "image": "https://cdn.simpleicons.org/target/4F46E5",
    "handler": function (response) {
      if (isInfluencerFlow) {
        alert(`🎉 Meeting Fee Paid! Razorpay ID: ${response.razorpay_payment_id}. Our team and assigned agent will connect with you soon!`);
      } else {
        alert(`🎉 Campaign Payment Successful! Razorpay ID: ${response.razorpay_payment_id}`);
      }
      completeOrderPlacement();
    },
    "prefill": {
      "name": activeUser ? `${activeUser.firstName} ${activeUser.lastName}` : 'Customer',
      "email": activeUser ? activeUser.email : '',
      "contact": activeUser ? activeUser.phone : ''
    },
    "theme": { "color": "#4F46E5" }
  };

  const rzp1 = new Razorpay(options);
  rzp1.open();
}

function completeOrderPlacement() {
  const newCampaign = {
    title: campaignFormValues.name || 'Influencer Campaign Consultation',
    brand: campaignFormValues.brand,
    platform: currentPlatform.name,
    plan: currentPlan.name,
    durationDays: currentPlan.days,
    daysLeft: currentPlan.days,
    leads: currentPlan.leads,
    startDate: new Date().toLocaleDateString(),
    status: isInfluencerFlow ? 'AGENT ASSIGNED - CALL SOON' : 'ACTIVE RUNNING'
  };

  userCampaigns.push(newCampaign);
  renderStudio();
  navigateTo('view-progress-studio');
}

function renderStudio() {
  const container = document.getElementById('campaigns-list');
  if (userCampaigns.length === 0) {
    container.innerHTML = `<p style="color:var(--muted); text-align:center;">No active ad campaigns yet. Launch one today!</p>`;
    return;
  }

  container.innerHTML = userCampaigns.map(c => `
    <div class="campaign-item">
      <div class="campaign-item-header">
        <h4>${c.title} - ${c.brand} (${c.platform})</h4>
        <span class="status-tag">${c.status}</span>
      </div>
      <p><strong>Package:</strong> ${c.plan} | <strong>Scope / Reach:</strong> ${c.leads}</p>
      <p><strong>Initiated On:</strong> ${c.startDate}</p>
      <div style="margin-top:10px;">
        <label>Status Progress: <strong>${c.daysLeft} of ${c.durationDays} Days Active</strong></label>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 100%;"></div></div>
      </div>
    </div>
  `).join('');
}

// Initial Page Setup
window.onload = () => {
  checkUrlForUserSession();
  renderPlatforms();
};
