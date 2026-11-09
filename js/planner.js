
/* ==========================================
   TANITI VACATION PLANNER
   Toast Notifications + Inline Validation
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY = "tanitiVacationPlanner";
    const DAY_MS = 86400000;
    const $ = id => document.getElementById(id);

    const defaultData = {
        tripName: "",
        startDate: "",
        endDate: "",
        countdownAnchor: "",
        budget: 0,
        activities: [],
        reservations: [],
        expenses: [],
        checklist: []
    };

    // ==========================================
    // DATA STORAGE
    // ==========================================

    function loadData() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (saved && typeof saved === "object" && !Array.isArray(saved)) {
                return {
                    ...defaultData,
                    ...saved,
                    activities: Array.isArray(saved.activities) ? saved.activities : [],
                    reservations: Array.isArray(saved.reservations) ? saved.reservations : [],
                    expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
                    checklist: Array.isArray(saved.checklist) ? saved.checklist : []
                };
            }
        } catch (error) {
            console.error("Could not load vacation data:", error);
        }

        return { ...defaultData };
    }

    let trip = loadData();

    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
            return true;
        } catch (error) {
            console.error("Could not save vacation data:", error);
            showToast("Could not save changes in this browser.", "error");
            return false;
        }
    }

    function createId() {
        return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
    }

    function createElement(tag, text, className = "") {
        const element = document.createElement(tag);

        if (text !== undefined && text !== null) {
            element.textContent = text;
        }

        if (className) {
            element.className = className;
        }

        return element;
    }

    function showEmpty(container, message) {
        container.replaceChildren(
            createElement("p", message, "empty-message")
        );
    }

    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================

    function showToast(message, type = "success") {
        const container = $("toast-container");

        if (!container) return;

        container.replaceChildren();

        const toast = createElement(
            "div",
            null,
            `toast toast-${type}`
        );

        const icon = createElement(
            "span",
            type === "success" ? "✓" : "!",
            "toast-icon"
        );

        icon.setAttribute("aria-hidden", "true");

        toast.append(
            icon,
            createElement("span", message)
        );

        container.append(toast);

        // Automatically disappear after three seconds.
        window.setTimeout(() => {
            if (!toast.isConnected) return;

            toast.classList.add("toast-hide");

            window.setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // ==========================================
    // INLINE FORM VALIDATION
    // ==========================================

    function clearFieldError(input) {
        if (!input) return;

        input.classList.remove("input-error");
        input.removeAttribute("aria-invalid");

        const group = input.closest(".form-group");

        if (!group) return;

        const error = group.querySelector(".form-error");

        if (error) {
            error.remove();
        }

        input.removeAttribute("aria-describedby");
    }

    function showFieldError(input, message) {
        if (!input) return;

        clearFieldError(input);

        const group = input.closest(".form-group");

        if (!group) return;

        input.classList.add("input-error");
        input.setAttribute("aria-invalid", "true");

        const error = createElement(
            "span",
            message,
            "form-error"
        );

        error.id = `${input.id}-error`;

        input.setAttribute(
            "aria-describedby",
            error.id
        );

        group.append(error);
    }

    function clearFormErrors(form) {
        form.querySelectorAll(
            "input, select, textarea"
        ).forEach(clearFieldError);
    }

    function validateRequired(input, message) {
        if (!input.value.trim()) {
            showFieldError(input, message);
            return false;
        }

        clearFieldError(input);
        return true;
    }

    function validateDate(input, message) {
        if (!validateRequired(input, message)) {
            return false;
        }

        if (!parseLocalDate(input.value)) {
            showFieldError(input, "Please select a valid date.");
            return false;
        }

        return true;
    }

    function validatePositiveAmount(input, message) {
        const value = input.value.trim();
        const amount = Number(value);

        if (!value) {
            showFieldError(input, message);
            return false;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            showFieldError(input, "Enter an amount greater than $0.");
            return false;
        }

        if (!input.validity.valid) {
            showFieldError(input, "Enter a valid dollar amount.");
            return false;
        }

        clearFieldError(input);
        return true;
    }

    function validateFormFields(form, fields) {
        let isValid = true;
        let firstInvalid = null;

        fields.forEach(({ input, validate }) => {
            if (!validate()) {
                isValid = false;

                if (!firstInvalid) {
                    firstInvalid = input;
                }
            }
        });

        if (firstInvalid) {
            firstInvalid.focus();
        }

        return isValid;
    }

    // Remove an error as the user corrects the field.
    document.querySelectorAll(
        ".planner-form input, .planner-form select, .planner-form textarea"
    ).forEach(input => {

        const clearIfCorrected = () => {
            if (!input.classList.contains("input-error")) {
                return;
            }

            if (input.value.trim() && input.validity.valid) {
                clearFieldError(input);
            }
        };

        input.addEventListener("input", clearIfCorrected);
        input.addEventListener("change", clearIfCorrected);
    });

    // ==========================================
    // DATE UTILITIES
    // ==========================================

    function parseLocalDate(dateString) {
        if (!dateString) return null;

        const parts = dateString.split("-").map(Number);

        if (
            parts.length !== 3 ||
            parts.some(part => !Number.isInteger(part))
        ) {
            return null;
        }

        const date = new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
        );

        if (
            date.getFullYear() !== parts[0] ||
            date.getMonth() !== parts[1] - 1 ||
            date.getDate() !== parts[2]
        ) {
            return null;
        }

        return date;
    }

    function todayString() {
        const today = new Date();

        const year = today.getFullYear();

        const month = String(
            today.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            today.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function calendarDay(dateString) {
        const date = parseLocalDate(dateString);

        if (!date) return null;

        return Math.floor(
            Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            ) / DAY_MS
        );
    }

    function daysBetween(firstDate, secondDate) {
        const first = calendarDay(firstDate);
        const second = calendarDay(secondDate);

        if (first === null || second === null) return 0;

        return second - first;
    }

    function formatDate(dateString) {
        const date = parseLocalDate(dateString);

        if (!date) return "Date not set";

        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function formatTime(timeString) {
        if (!timeString) return "";

        const [hours, minutes] = timeString
            .split(":")
            .map(Number);

        const date = new Date();

        date.setHours(hours, minutes, 0, 0);

        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(amount);
    }

    function clamp(value, minimum, maximum) {
        return Math.min(
            maximum,
            Math.max(minimum, value)
        );
    }

    // ==========================================
    // PROGRESS BARS
    // ==========================================

    function updateProgressBar(barId, fillId, percentage) {
        const bar = $(barId);
        const fill = $(fillId);

        const safePercentage = clamp(
            Math.round(percentage),
            0,
            100
        );

        if (bar) {
            bar.setAttribute(
                "aria-valuenow",
                String(safePercentage)
            );
        }

        if (fill) {
            fill.style.width = `${safePercentage}%`;
        }
    }

    // ==========================================
    // TRIP DETAILS
    // ==========================================

    const tripForm = $("trip-form");
    const tripNameInput = $("trip-name");
    const startDateInput = $("start-date");
    const endDateInput = $("end-date");

    function populateTripForm() {
        tripNameInput.value = trip.tripName || "";
        startDateInput.value = trip.startDate || "";
        endDateInput.value = trip.endDate || "";
    }

    function updateActivityDateLimits() {
        const input = $("activity-date");

        if (trip.startDate && trip.endDate) {
            input.min = trip.startDate;
            input.max = trip.endDate;
        } else {
            input.removeAttribute("min");
            input.removeAttribute("max");
        }
    }

    tripForm.addEventListener("submit", event => {
        event.preventDefault();

        clearFormErrors(tripForm);

        const valid = validateFormFields(tripForm, [
            {
                input: startDateInput,
                validate: () => validateDate(
                    startDateInput,
                    "Please select your departure date."
                )
            },
            {
                input: endDateInput,
                validate: () => validateDate(
                    endDateInput,
                    "Please select your return date."
                )
            }
        ]);

        if (!valid) return;

        if (startDateInput.value < todayString()) {
            showFieldError(
                startDateInput,
                "Your departure date cannot be in the past."
            );

            startDateInput.focus();
            return;
        }

        if (endDateInput.value < startDateInput.value) {
            showFieldError(
                endDateInput,
                "Return date must be on or after departure date."
            );

            endDateInput.focus();
            return;
        }

        const datesChanged =
            trip.startDate !== startDateInput.value ||
            trip.endDate !== endDateInput.value;

        trip.tripName = tripNameInput.value.trim();
        trip.startDate = startDateInput.value;
        trip.endDate = endDateInput.value;

        if (datesChanged || !trip.countdownAnchor) {
            trip.countdownAnchor = todayString();
        }

        if (saveData()) {
            updateCountdown();
            updateActivityDateLimits();
            renderActivities();

            showToast("Vacation dates saved!");
        }
    });

    // ==========================================
    // VACATION COUNTDOWN
    // ==========================================

    function updateCountdown() {
        const number = $("countdown-number");
        const message = $("countdown-message");

        const start = calendarDay(trip.startDate);
        const end = calendarDay(trip.endDate);
        const today = calendarDay(todayString());

        if (
            start === null ||
            end === null ||
            end < start
        ) {
            number.textContent = "--";

            message.textContent =
                "Enter your vacation dates to begin the countdown.";

            updateProgressBar(
                "countdown-progress",
                "countdown-progress-fill",
                0
            );

            return;
        }

        const daysRemaining = start - today;
        let progress = 0;

        if (daysRemaining > 0) {
            number.textContent = daysRemaining;

            message.textContent =
                `Days until ${trip.tripName || "your Taniti vacation"}!`;

            const anchor = calendarDay(
                trip.countdownAnchor || todayString()
            );

            const totalDays = Math.max(
                1,
                start - anchor
            );

            const elapsed = Math.max(
                0,
                today - anchor
            );

            progress = (elapsed / totalDays) * 100;

        } else if (today <= end) {
            number.textContent = "0";

            message.textContent =
                "Your Taniti vacation is happening now! Enjoy paradise!";

            progress = 100;

        } else {
            number.textContent = "0";

            message.textContent =
                "Your vacation has ended. Time to plan your next adventure!";

            progress = 100;
        }

        updateProgressBar(
            "countdown-progress",
            "countdown-progress-fill",
            progress
        );
    }

    // ==========================================
    // DASHBOARD STATISTICS
    // ==========================================

    function getTotalExpenses() {
        return trip.expenses.reduce(
            (total, expense) =>
                total + Number(expense.amount || 0),
            0
        );
    }

    function getChecklistPercentage() {
        const total = trip.checklist.length;

        if (total === 0) return 0;

        const completed = trip.checklist.filter(
            item => item.completed
        ).length;

        return Math.round(
            (completed / total) * 100
        );
    }

    function updateStats() {
        $("activity-count").textContent =
            trip.activities.length;

        $("reservation-count").textContent =
            trip.reservations.length;

        $("total-expenses").textContent =
            formatCurrency(getTotalExpenses());

        const percentage = getChecklistPercentage();

        $("checklist-progress").textContent =
            `${percentage}%`;

        $("checklist-progress-label").textContent =
            `${percentage}% Complete`;

        updateProgressBar(
            "checklist-progress-bar",
            "checklist-progress-fill",
            percentage
        );

        updateBudget();
    }

    // ==========================================
    // VACATION BUDGET
    // ==========================================

    const budgetForm = $("budget-form");
    const budgetInput = $("trip-budget");

    function populateBudgetForm() {
        const budget = Number(trip.budget);

        budgetInput.value =
            Number.isFinite(budget) && budget > 0
                ? budget
                : "";
    }

    budgetForm.addEventListener("submit", event => {
        event.preventDefault();

        clearFormErrors(budgetForm);

        const value = budgetInput.value.trim();
        const budget = Number(value);

        if (!value) {
            showFieldError(
                budgetInput,
                "Please enter your vacation budget."
            );
            return;
        }

        if (
            !Number.isFinite(budget) ||
            budget < 0 ||
            !budgetInput.validity.valid
        ) {
            showFieldError(
                budgetInput,
                "Enter a valid budget of $0 or more."
            );
            return;
        }

        trip.budget = budget;

        if (saveData()) {
            updateBudget();
            showToast("Vacation budget saved!");
        }
    });

    function updateBudget() {
        const budget = Number(trip.budget) || 0;
        const spent = getTotalExpenses();
        const remaining = budget - spent;

        $("budget-total").textContent =
            formatCurrency(budget);

        $("budget-spent").textContent =
            formatCurrency(spent);

        $("budget-remaining").textContent =
            formatCurrency(remaining);

        const percentage = budget > 0
            ? (spent / budget) * 100
            : 0;

        updateProgressBar(
            "budget-progress",
            "budget-progress-fill",
            percentage
        );

        const progressFill = $("budget-progress-fill");
        const message = $("budget-message");

        const isOverBudget =
            budget > 0 && spent > budget;

        progressFill.classList.toggle(
            "over-budget",
            isOverBudget
        );

        message.classList.toggle(
            "over-budget",
            isOverBudget
        );

        if (budget <= 0) {
            message.textContent =
                "Set a vacation budget to track your spending.";

        } else if (spent > budget) {
            message.textContent =
                `You are ${formatCurrency(spent - budget)} over budget.`;

        } else if (spent === budget) {
            message.textContent =
                "You've reached your vacation budget.";

        } else {
            message.textContent =
                `${formatCurrency(remaining)} remaining for your island adventure!`;
        }

        $("budget-progress").setAttribute(
            "aria-valuetext",
            budget > 0
                ? `${Math.round(percentage)} percent of budget spent`
                : "No budget set"
        );
    }

    // ==========================================
    // ITINERARY BUILDER
    // ==========================================

    const activityForm = $("activity-form");
    const activityList = $("activity-list");

    activityForm.addEventListener("submit", event => {
        event.preventDefault();

        clearFormErrors(activityForm);

        const nameInput = $("activity-name");
        const dateInput = $("activity-date");
        const timeInput = $("activity-time");

        const valid = validateFormFields(activityForm, [
            {
                input: nameInput,
                validate: () => validateRequired(
                    nameInput,
                    "Please enter an activity name."
                )
            },
            {
                input: dateInput,
                validate: () => validateDate(
                    dateInput,
                    "Please select an activity date."
                )
            },
            {
                input: timeInput,
                validate: () => validateRequired(
                    timeInput,
                    "Please select an activity time."
                )
            }
        ]);

        if (!valid) return;

        if (
            trip.startDate &&
            trip.endDate &&
            (
                dateInput.value < trip.startDate ||
                dateInput.value > trip.endDate
            )
        ) {
            showFieldError(
                dateInput,
                "Activity date must fall within your vacation dates."
            );

            dateInput.focus();
            return;
        }

        trip.activities.push({
            id: createId(),
            name: nameInput.value.trim(),
            date: dateInput.value,
            time: timeInput.value,
            notes: $("activity-notes").value.trim()
        });

        if (saveData()) {
            renderActivities();
            updateStats();
            activityForm.reset();

            showToast("Activity added to your itinerary!");
        }
    });

    function getDayLabel(date) {
        if (
            trip.startDate &&
            date >= trip.startDate &&
            date <= trip.endDate
        ) {
            const dayNumber =
                daysBetween(trip.startDate, date) + 1;

            return `Day ${dayNumber} - ${formatDate(date)}`;
        }

        return formatDate(date);
    }

    function renderActivities() {
        activityList.replaceChildren();

        if (!trip.activities.length) {
            showEmpty(
                activityList,
                "No activities scheduled yet. Start building your adventure!"
            );
            return;
        }

        const sorted = [...trip.activities].sort(
            (a, b) =>
                `${a.date}T${a.time}`.localeCompare(
                    `${b.date}T${b.time}`
                )
        );

        const grouped = new Map();

        sorted.forEach(activity => {
            if (!grouped.has(activity.date)) {
                grouped.set(activity.date, []);
            }

            grouped.get(activity.date).push(activity);
        });

        grouped.forEach((activities, date) => {

            const daySection = createElement(
                "div",
                null,
                "itinerary-day"
            );

            const heading = createElement(
                "h4",
                getDayLabel(date),
                "itinerary-day-heading"
            );

            const dayActivities = createElement(
                "div",
                null,
                "itinerary-day-activities"
            );

            activities.forEach(activity => {
                const item = createElement(
                    "div",
                    null,
                    "planner-list-item"
                );

                const details = createElement("div");

                details.append(
                    createElement("h4", activity.name),
                    createElement(
                        "p",
                        formatTime(activity.time)
                    )
                );

                if (activity.notes) {
                    details.append(
                        createElement("p", activity.notes)
                    );
                }

                item.append(
                    details,
                    createDeleteButton(() => {
                        trip.activities = trip.activities.filter(
                            entry => entry.id !== activity.id
                        );

                        if (saveData()) {
                            renderActivities();
                            updateStats();
                            showToast("Activity removed.");
                        }
                    })
                );

                dayActivities.append(item);
            });

            daySection.append(heading, dayActivities);
            activityList.append(daySection);
        });
    }

    function createDeleteButton(onDelete) {
        const button = createElement(
            "button",
            "Remove",
            "planner-delete-btn"
        );

        button.type = "button";
        button.addEventListener("click", onDelete);

        return button;
    }

    function prefillActivityFromLink() {
        const params = new URLSearchParams(
            window.location.search
        );

        const activityName = params.get("activity");

        if (!activityName) return;

        $("activity-name").value = activityName;

        if (
            trip.startDate &&
            trip.endDate &&
            !$("activity-date").value
        ) {
            $("activity-date").value = trip.startDate;
        }
    }

    // ==========================================
    // RESERVATIONS
    // ==========================================

    const reservationForm = $("reservation-form");
    const reservationList = $("reservation-list");

    reservationForm.addEventListener("submit", event => {
        event.preventDefault();

        clearFormErrors(reservationForm);

        const typeInput = $("reservation-type");
        const nameInput = $("reservation-name");
        const dateInput = $("reservation-date");

        const valid = validateFormFields(reservationForm, [
            {
                input: typeInput,
                validate: () => validateRequired(
                    typeInput,
                    "Please select a reservation type."
                )
            },
            {
                input: nameInput,
                validate: () => validateRequired(
                    nameInput,
                    "Please enter a reservation name."
                )
            },
            {
                input: dateInput,
                validate: () => validateDate(
                    dateInput,
                    "Please select a reservation date."
                )
            }
        ]);

        if (!valid) return;

        trip.reservations.push({
            id: createId(),
            type: typeInput.value,
            name: nameInput.value.trim(),
            date: dateInput.value,
            reference: $("reservation-reference").value.trim()
        });

        if (saveData()) {
            renderReservations();
            updateStats();
            reservationForm.reset();

            showToast("Reservation added!");
        }
    });

    function getReservationIcon(type) {
        const icons = {
            Flight: "✈",
            Hotel: "🏨",
            Activity: "🎟",
            Transportation: "🚗",
            Other: "📋"
        };

        return icons[type] || "📋";
    }

    function renderReservations() {
        reservationList.replaceChildren();

        if (!trip.reservations.length) {
            showEmpty(
                reservationList,
                "No reservations added yet."
            );
            return;
        }

        const sorted = [...trip.reservations].sort(
            (a, b) => a.date.localeCompare(b.date)
        );

        sorted.forEach(reservation => {
            const item = createElement(
                "div",
                null,
                "planner-list-item"
            );

            const details = createElement("div");

            details.append(
                createElement(
                    "h4",
                    `${getReservationIcon(reservation.type)} ${reservation.type}: ${reservation.name}`
                ),
                createElement(
                    "p",
                    formatDate(reservation.date)
                )
            );

            if (reservation.reference) {
                details.append(
                    createElement(
                        "p",
                        `Reference: ${reservation.reference}`
                    )
                );
            }

            item.append(
                details,
                createDeleteButton(() => {
                    trip.reservations = trip.reservations.filter(
                        entry => entry.id !== reservation.id
                    );

                    if (saveData()) {
                        renderReservations();
                        updateStats();
                        showToast("Reservation removed.");
                    }
                })
            );

            reservationList.append(item);
        });
    }

    // ==========================================
    // EXPENSE TRACKER
    // ==========================================

    const expenseForm = $("expense-form");
    const expenseList = $("expense-list");

    expenseForm.addEventListener("submit", event => {
        event.preventDefault();

        clearFormErrors(expenseForm);

        const nameInput = $("expense-name");
        const categoryInput = $("expense-category");
        const amountInput = $("expense-amount");

        const valid = validateFormFields(expenseForm, [
            {
                input: nameInput,
                validate: () => validateRequired(
                    nameInput,
                    "Please enter an expense description."
                )
            },
            {
                input: categoryInput,
                validate: () => validateRequired(
                    categoryInput,
                    "Please select an expense category."
                )
            },
            {
                input: amountInput,
                validate: () => validatePositiveAmount(
                    amountInput,
                    "Please enter an expense amount."
                )
            }
        ]);

        if (!valid) return;

        trip.expenses.push({
            id: createId(),
            name: nameInput.value.trim(),
            category: categoryInput.value,
            amount: Number(amountInput.value)
        });

        if (saveData()) {
            renderExpenses();
            updateStats();
            expenseForm.reset();

            showToast("Expense added!");
        }
    });

    function renderExpenses() {
        expenseList.replaceChildren();

        if (!trip.expenses.length) {
            showEmpty(
                expenseList,
                "No expenses recorded yet."
            );
            return;
        }

        trip.expenses.forEach(expense => {
            const item = createElement(
                "div",
                null,
                "planner-list-item"
            );

            const details = createElement("div");

            details.append(
                createElement("h4", expense.name),
                createElement(
                    "p",
                    `${expense.category} - ${formatCurrency(Number(expense.amount))}`
                )
            );

            item.append(
                details,
                createDeleteButton(() => {
                    trip.expenses = trip.expenses.filter(
                        entry => entry.id !== expense.id
                    );

                    if (saveData()) {
                        renderExpenses();
                        updateStats();
                        showToast("Expense removed.");
                    }
                })
            );

            expenseList.append(item);
        });
    }

    // ==========================================
    // VACATION CHECKLIST
    // ==========================================

    const checklistForm = $("checklist-form");
    const checklistList = $("checklist-items");

    checklistForm.addEventListener("submit", event => {
        event.preventDefault();

        clearFormErrors(checklistForm);

        const input = $("checklist-item");

        if (!validateRequired(
            input,
            "Please enter a checklist item."
        )) {
            input.focus();
            return;
        }

        trip.checklist.push({
            id: createId(),
            name: input.value.trim(),
            completed: false
        });

        if (saveData()) {
            renderChecklist();
            updateStats();
            checklistForm.reset();

            showToast("Checklist item added!");
        }
    });

    function renderChecklist() {
        checklistList.replaceChildren();

        if (!trip.checklist.length) {
            showEmpty(
                checklistList,
                "Your checklist is empty. Add your first item!"
            );
            return;
        }

        trip.checklist.forEach(entry => {
            const item = createElement(
                "div",
                null,
                "planner-list-item"
            );

            const label = createElement(
                "label",
                null,
                "checklist-label"
            );

            const checkbox = document.createElement("input");

            checkbox.type = "checkbox";
            checkbox.checked = Boolean(entry.completed);

            checkbox.addEventListener("change", () => {
                entry.completed = checkbox.checked;

                if (saveData()) {
                    renderChecklist();
                    updateStats();

                    showToast(
                        entry.completed
                            ? "Checklist item completed!"
                            : "Checklist item unchecked."
                    );
                }
            });

            const text = createElement(
                "span",
                entry.name
            );

            if (entry.completed) {
                text.classList.add("completed");
            }

            label.append(checkbox, text);

            item.append(
                label,
                createDeleteButton(() => {
                    trip.checklist = trip.checklist.filter(
                        item => item.id !== entry.id
                    );

                    if (saveData()) {
                        renderChecklist();
                        updateStats();
                        showToast("Checklist item removed.");
                    }
                })
            );

            checklistList.append(item);
        });
    }

    // ==========================================
    // INITIALIZE PLANNER
    // ==========================================

    populateTripForm();
    populateBudgetForm();

    updateActivityDateLimits();
    prefillActivityFromLink();

    updateCountdown();

    renderActivities();
    renderReservations();
    renderExpenses();
    renderChecklist();

    updateStats();

    // Keep countdown current while the page is open.
    setInterval(updateCountdown, 60000);

});
