const mypageContent = document.querySelector(".mypage-content");
const profileView = mypageContent.querySelector(".mypage-profile-view");
const serviceView = mypageContent.querySelector(".mypage-service-view");
const serviceTitle = document.getElementById("mypage-service-title");
const mypageLinks = Array.from(document.querySelectorAll(".mypage-menu a"));
const mypageTabBar = document.querySelector(".mypage-tabs");
const mypageTabs = Array.from(mypageTabBar.querySelectorAll("[role=tab]"));
const ratingsSection = document.querySelector(".mypage-ratings");
const ratingsHeading = document.getElementById("mypage-ratings-title");
const ratingsLink = document.querySelector(".mypage-rating-stat a");
const heartsHeading = document.getElementById("mypage-activity-wishes-title");
const heartsLink = document.querySelector(".mypage-heart-stat a");
const mypageLogo = document.querySelector(".logo");

new ResizeObserver(function () {
    const { right } = mypageLogo.getBoundingClientRect();
    const { left } = document.body.getBoundingClientRect();
    document.body.style.setProperty("--mypage-logo-edge", right - left + "px");
}).observe(mypageLogo);

function renderMypageRoute() {
    const hash = window.location.hash;
    const showHearts = hash === "#hearts";
    const tabHash = showHearts ? "#activity" : hash;
    const activeLink = mypageLinks.find(function (link) {
        return link.hash === hash;
    });
    const requestedTab = mypageTabs.find(function (tab) {
        return "#" + tab.dataset.view === tabHash;
    });
    const activeTab = requestedTab || mypageTabs[0];
    const showService = Boolean(activeLink && !requestedTab);
    const showRatings = hash === "#ratings";

    for (const link of mypageLinks) {
        if (link === activeLink) {
            link.setAttribute("aria-current", "location");
        } else {
            link.removeAttribute("aria-current");
        }
    }

    profileView.hidden = showService;
    serviceView.hidden = !showService;
    ratingsSection.hidden = !showRatings;
    mypageTabBar.hidden = showRatings;
    for (const [link, current] of [[ratingsLink, showRatings], [heartsLink, showHearts]]) {
        if (current) {
            link.setAttribute("aria-current", "location");
        } else {
            link.removeAttribute("aria-current");
        }
    }
    if (showService) {
        serviceTitle.textContent = activeLink.textContent;
    }

    for (const tab of mypageTabs) {
        const selected = tab === activeTab;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected || showRatings;
    }
    if (showRatings || showHearts) {
        const heading = showRatings ? ratingsHeading : heartsHeading;
        heading.focus({ preventScroll: true });
        heading.scrollIntoView();
    } else {
        window.scrollTo({ top: 0 });
    }
    requestAnimationFrame(layoutTags);
}

for (const tab of mypageTabs) {
    tab.addEventListener("click", function () {
        window.location.hash = tab.dataset.view;
    });
}

mypageTabBar.addEventListener("keydown", function (event) {
    const index = mypageTabs.indexOf(event.target);
    let next;
    switch (event.key) {
        case "ArrowLeft":
            next = (index - 1 + mypageTabs.length) % mypageTabs.length;
            break;
        case "ArrowRight":
            next = (index + 1) % mypageTabs.length;
            break;
        case "Home":
            next = 0;
            break;
        case "End":
            next = mypageTabs.length - 1;
            break;
        default:
            return;
    }
    event.preventDefault();
    mypageTabs[next].focus();
    mypageTabs[next].click();
});

window.addEventListener("hashchange", renderMypageRoute);
renderMypageRoute();

const genreList = document.querySelector(".mypage-genres");
const posterList = document.querySelector(".mypage-posters");
const posterMoreItem = document.querySelector(".mypage-posters-more-item");
const posterMoreButton = document.querySelector(".mypage-posters-more");
const posterMorePreview = posterMoreButton.querySelector("img");
const posterMoreCount = posterMoreButton.querySelector("span");
const historySummary = document.querySelector(".mypage-history-summary");
const historyCount = historySummary.querySelector(".mypage-history-count");
const historyFilter = historySummary.querySelector(".mypage-history-filter");
const tagList = document.querySelector(".mypage-tags");
const tagStatus = document.querySelector(".mypage-tag-status");
const filterTooltip = "이 태그의 관람 영화 보기";
const resetTooltip = "전체 관람 내역 보기";
const activityRatings = document.querySelector(".mypage-activity-ratings");
const activityRatingCount = document.querySelector(".mypage-activity-rating-count");
const activityRatingsEmpty = document.querySelector(".mypage-activity-ratings-empty");
const wishList = document.querySelector(".mypage-activity-wishes");
const wishCount = document.querySelector(".mypage-wish-count");
const heartCount = document.querySelector(".mypage-heart-count");
const wishesEmpty = document.querySelector(".mypage-wishes-empty");
const ratingsList = ratingsSection.querySelector(".mypage-ratings-list");
const ratingsEmpty = ratingsSection.querySelector(".mypage-ratings-empty");
const ratingCount = document.querySelector(".mypage-rating-count");
const monthLabel = document.querySelector(".mypage-month");
const calendarDays = document.querySelector(".mypage-calendar-days");
let month = new Date();
let historyMovies = [];
let wishMovies;
let visiblePosterRows = 1;

const shareStatus = document.querySelector(".mypage-share-status");
const shareProfile = document.querySelector(".mypage-share-profile");
shareProfile.addEventListener("click", async function () {
    const nickname = document.querySelector(".mypage-nickname").textContent;
    const totalMinutes = historyMovies.reduce((sum, movie) => sum + movie.minutes, 0);
    const duration = Math.floor(totalMinutes / 60) + "시간 " + totalMinutes % 60 + "분";
    const profileText = [
        "CINE:ON | " + nickname,
        "예시 관람 기록",
        "관람한 영화 " + historyMovies.length + "편",
        "감상 시간 " + duration
    ].join("\n");
    shareStatus.textContent = "";
    try {
        if (navigator.share) {
            await navigator.share({ text: profileText });
            return;
        }
        await navigator.clipboard.writeText(profileText);
        shareStatus.textContent = "프로필 요약을 복사했어요.";
    } catch (error) {
        if (error.name !== "AbortError") {
            shareStatus.textContent = "프로필 요약을 공유할 수 없어요.";
        }
    }
});

function movieReviewHref(movieId) {
    return "4_CINEON_myreview.html?movie=" + encodeURIComponent(movieId);
}

function makeMovieTile(movie, href, rating) {
    const row = document.createElement("li");
    const content = document.createElement(href ? "a" : "div");
    const image = document.createElement("img");
    image.className = "mypage-tile-poster";
    image.src = movie.poster;
    image.alt = "";
    image.loading = "lazy";
    if (href) {
        content.href = href;
        image.title = rating ? "내 평가 보기" : "영화 상세 보기";
        image.setAttribute("aria-hidden", "true");
    }

    const title = document.createElement("strong");
    title.textContent = movie.title;
    content.append(image, title);
    if (rating) {
        const score = document.createElement("span");
        score.className = "mypage-activity-score";
        score.textContent = rating.toFixed(1);
        score.setAttribute("aria-label", "별점 " + rating + "점");
        content.appendChild(score);
    }

    row.appendChild(content);
    return row;
}

function renderRatings() {
    const username = localStorage.getItem(authSessionKey);
    const ratings = [];
    for (const movie of username ? historyMovies : []) {
        try {
            const review = readPersonalReview(username, movie.id);
            if (review && Number.isFinite(review.rating) && Number.isInteger(review.rating * 2) &&
                review.rating >= 0.5 && review.rating <= 5) {
                ratings.push({ movie, review });
            }
        } catch {
            // 손상된 평가 한 건 때문에 다른 평가의 표시를 막지 않는다.
        }
    }

    ratings.sort(function (first, second) {
        return (second.review.updatedAt || "").localeCompare(first.review.updatedAt || "");
    });
    ratingCount.textContent = ratings.length;
    activityRatingCount.textContent = ratings.length;
    activityRatingsEmpty.hidden = ratings.length > 0;
    activityRatings.replaceChildren(...ratings.map(function ({ movie, review }) {
        return makeMovieTile(movie, movieReviewHref(movie.id), review.rating);
    }));
    ratingsEmpty.hidden = ratings.length > 0;
    ratingsList.replaceChildren();

    for (const { movie, review } of ratings) {
        const row = document.createElement("li");
        const link = document.createElement("a");
        const poster = document.createElement("img");
        const content = document.createElement("div");
        const title = document.createElement("h3");
        const score = document.createElement("p");
        const stars = document.createElement("span");
        const comment = document.createElement("p");

        link.href = movieReviewHref(movie.id);
        title.id = "mypage-rating-" + movie.id;
        title.textContent = movie.title;
        link.setAttribute("aria-labelledby", title.id);
        poster.src = movie.poster;
        poster.alt = "";
        poster.loading = "lazy";
        score.className = "mypage-rating-score";
        stars.className = "rating-stars";
        stars.setAttribute("aria-hidden", "true");
        stars.style.setProperty("--rating-fill", review.rating * 20 + "%");
        score.append(stars, " " + review.rating + " / 5");
        comment.className = "mypage-rating-comment";
        comment.textContent = review.comment || "작성한 관람평이 없어요.";
        content.append(title, score, comment);
        link.append(poster, content);
        row.appendChild(link);
        ratingsList.appendChild(row);
    }
}

function renderWishes() {
    const movies = (wishMovies || historyMovies).filter(movie => isMovieWished(movie.poster));
    wishCount.textContent = movies.length;
    heartCount.textContent = movies.length;
    wishesEmpty.hidden = movies.length > 0;
    wishList.replaceChildren(...movies.map(function (movie) {
        return makeMovieTile(movie, movie.detail !== "#" ? movie.detail : null);
    }));
}

function makeHistoryPoster(movie) {
    const href = "#"; // 예매 내역 페이지가 완성되면 연결할 경로
    const row = makeMovieTile(movie, href);
    const link = row.querySelector("a");
    const image = row.querySelector(".mypage-tile-poster");
    image.title = "예매 내역 보기";
    if (href === "#") {
        link.addEventListener("click", function (event) {
            event.preventDefault();
        });
    }
    const ticket = movie.ticket;
    if (!ticket) {
        return row;
    }

    const title = row.querySelector("strong");
    title.id = "mypage-history-film-" + movie.id;
    link.setAttribute("aria-labelledby", title.id);
    const frame = document.createElement("figure");
    frame.className = "mypage-history-poster";
    const overlay = document.createElement("figcaption");
    overlay.className = "mypage-ticket-overlay";
    overlay.id = "mypage-ticket-" + movie.id;
    link.setAttribute("aria-describedby", overlay.id);

    const start = Date.parse(movie.date + "T" + ticket.start + ":00Z");
    const end = new Date(start + movie.minutes * 60000).toISOString().slice(11, 16);
    const details = [
        ["mypage-ticket-title", movie.title],
        ["", movie.date.replaceAll("-", ".")],
        ["", ticket.start + "–" + end],
        ["", ticket.auditorium + " | " + ticket.seats.join(", ")]
    ];
    for (const [className, text] of details) {
        const line = document.createElement("p");
        line.className = className;
        line.textContent = text;
        overlay.appendChild(line);
    }

    const types = document.createElement("p");
    types.className = "mypage-ticket-types";
    const guestLabels = Object.entries(ticket.guests).map(function ([type, count]) {
        return type + " " + count;
    });
    for (const label of [...guestLabels, ticket.format]) {
        const badge = document.createElement("span");
        badge.className = "mypage-ticket-type";
        badge.textContent = label;
        types.appendChild(badge);
    }
    overlay.appendChild(types);

    image.replaceWith(frame);
    frame.append(image, overlay);
    return row;
}

function renderPosters(tag) {
    const movies = tag ? historyMovies.filter(function (movie) {
        return (movie.tags || []).includes(tag);
    }) : historyMovies;
    visiblePosterRows = 1;
    posterList.replaceChildren(...movies.map(makeHistoryPoster), posterMoreItem);
    historyFilter.textContent = tag ? "#" + tag : "전체";
    historyFilter.classList.toggle("is-filtered", Boolean(tag));
    historyCount.textContent = movies.length + "편";
    tagStatus.textContent = (tag || "전체") + " · " + movies.length + "편";
    updatePosterRows();
}

function setHistoryTag(button) {
    const pressed = tagList.querySelector('[aria-pressed="true"]');
    if (pressed) {
        pressed.setAttribute("aria-pressed", "false");
        pressed.title = filterTooltip;
    }
    if (button) {
        button.setAttribute("aria-pressed", "true");
        button.title = resetTooltip;
    }
    renderPosters(button?.textContent);
}

function updatePosterRows() {
    if (!posterList.clientWidth) {
        return;
    }
    // auto-fill로 계산된 그리드 열 개수만큼 한 줄에 표시한다.
    const columns = getComputedStyle(posterList).gridTemplateColumns.split(" ").length;
    const posters = Array.from(posterList.children).slice(0, -1);
    const slots = columns * visiblePosterRows;
    const hasMore = posters.length > slots;
    const limit = hasMore ? slots - 1 : slots;
    for (const [index, poster] of posters.entries()) {
        poster.hidden = index >= limit;
    }
    posterMoreItem.hidden = !hasMore;
    if (hasMore) {
        const remaining = posters.length - limit;
        const preview = posters[limit].querySelector("img").getAttribute("src");
        if (posterMorePreview.getAttribute("src") !== preview) {
            posterMorePreview.src = preview;
        }
        posterMoreCount.textContent = "+" + remaining;
        posterMoreButton.setAttribute("aria-label", "영화 " + remaining + "편 더 보기");
    }
}

posterMoreButton.addEventListener("click", function () {
    const firstHidden = posterList.querySelector("li[hidden]");
    const showKeyboardFocus = posterMoreButton.matches(":focus-visible");
    visiblePosterRows++;
    updatePosterRows();
    const visibleCount = posterList.querySelectorAll("li:not([hidden], .mypage-posters-more-item)").length;
    tagStatus.textContent = "영화 " + visibleCount + "편 표시";
    if (firstHidden && showKeyboardFocus) {
        const next = firstHidden.querySelector("a") || firstHidden;
        if (next === firstHidden) {
            next.tabIndex = -1;
        }
        next.focus();
    }
});

new ResizeObserver(updatePosterRows).observe(posterList);

function layoutTags() {
    const width = tagList.clientWidth;
    const items = Array.from(tagList.children);
    if (!width || !items.length) {
        return;
    }
    tagList.classList.remove("is-positioned");

    const sizes = items.map(function (item) {
        const button = item.firstElementChild.getBoundingClientRect();
        return { width: Math.ceil(button.width), height: Math.ceil(button.height) };
    });
    const positions = [];
    for (const [index, size] of sizes.entries()) {
        const position = findTagPosition(size, width, positions, index);
        if (!position) {
            return;
        }
        positions.push(position);
    }

    const left = Math.min(...positions.map(position => position.left));
    const right = Math.max(...positions.map(position => position.left + position.width));
    const top = Math.min(...positions.map(position => position.top));
    const bottom = Math.max(...positions.map(position => position.top + position.height));
    positions.forEach(function (position, index) {
        const item = items[index];
        item.style.setProperty("--tag-left", position.left + (width - left - right) / 2 + "px");
        item.style.setProperty("--tag-top", position.top - top + 4 + "px");
        item.style.setProperty("--tag-width", position.width + "px");
    });
    tagList.style.setProperty("--tag-cloud-height", bottom - top + 8 + "px");
    tagList.classList.add("is-positioned");
}

function findTagPosition(size, width, positions, index) {
    const gap = 4;
    // 중심부터 바깥으로 이동하며 이미 놓인 버튼 영역과 겹치지 않는 위치를 찾는다.
    for (let step = 0; step < 360; step++) {
        const angle = step * 0.2 + index * 2.4 + 0.45;
        const radius = step * 0.65;
        const left = (width - size.width) / 2 + Math.cos(angle) * radius * 1.25;
        const top = Math.sin(angle) * radius - size.height / 2;
        if (left < 0 || left + size.width > width) {
            continue;
        }
        const overlaps = positions.some(function (position) {
            return left < position.left + position.width + gap &&
                left + size.width + gap > position.left &&
                top < position.top + position.height + gap &&
                top + size.height + gap > position.top;
        });
        if (!overlaps) {
            return { left, top, width: size.width, height: size.height };
        }
    }
    return null;
}

window.addEventListener("resize", layoutTags);

function renderTags() {
    const tagCounts = new Map();
    for (const movie of historyMovies) {
        for (const tag of new Set(movie.tags || [])) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
    }

    const displayedTags = Array.from(tagCounts)
        .filter(function ([, count]) {
            return count >= 2;
        })
        .sort(function (first, second) {
            return second[1] - first[1];
        })
        .slice(0, 6);

    for (const [tag, count] of displayedTags) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = tag;
        button.title = filterTooltip;
        button.setAttribute("aria-controls", posterList.id);
        button.setAttribute("aria-pressed", "false");
        button.style.setProperty("--tag-size", Math.min(16 + (count - 2) * 8, 32) + "px");
        button.style.setProperty("--tag-weight", Math.min(400 + (count - 2) * 300, 800));
        button.addEventListener("click", function () {
            setHistoryTag(button.getAttribute("aria-pressed") === "true" ? null : button);
        });
        item.appendChild(button);
        tagList.appendChild(item);
    }
    tagList.closest(".mypage-tags-card").hidden = displayedTags.length === 0;
    layoutTags();
    document.fonts.ready.then(layoutTags);
}

function renderHistory() {
    const genres = new Map();
    for (const movie of historyMovies) {
        for (const genre of movie.genres) {
            genres.set(genre, (genres.get(genre) || 0) + 1);
        }
    }

    const displayedGenres = Array.from(genres).sort(function (first, second) {
        return second[1] - first[1] || first[0].localeCompare(second[0], "ko");
    }).slice(0, 5);
    const maxCount = displayedGenres[0]?.[1] || 1;
    for (const [genre, count] of displayedGenres) {
        const item = document.createElement("li");
        const name = document.createElement("strong");
        const detail = document.createElement("span");
        const plot = document.createElement("div");
        const bar = document.createElement("span");
        name.textContent = genre;
        detail.textContent = count + "편";
        detail.className = "mypage-visually-hidden";
        item.title = genre + " " + detail.textContent;
        plot.className = "mypage-genre-plot";
        bar.className = "mypage-genre-bar";
        bar.style.setProperty("--genre-share", count / maxCount);
        bar.setAttribute("aria-hidden", "true");
        plot.append(detail, bar);
        item.append(name, plot);
        genreList.appendChild(item);
    }

    renderPosters();
    renderTags();
}

function makeCalendarPoster(date, movies) {
    const tile = document.createElement("div");
    const titles = movies.map(movie => movie.title).join(", ");
    tile.className = "mypage-calendar-day-poster";
    tile.title = date.replaceAll("-", ".") + " · " + titles;
    tile.setAttribute("role", "img");
    tile.setAttribute("aria-label", date + " 관람 영화 " + movies.length + "편, " + titles);

    const stack = document.createElement("span");
    stack.className = "mypage-calendar-stack";
    stack.setAttribute("aria-hidden", "true");
    for (const movie of movies.slice(0, 3).reverse()) {
        const poster = document.createElement("img");
        poster.src = movie.poster;
        poster.alt = "";
        poster.loading = "lazy";
        stack.appendChild(poster);
    }
    if (movies.length > 1) {
        const badge = document.createElement("span");
        badge.className = "mypage-calendar-badge";
        badge.textContent = movies.length;
        stack.appendChild(badge);
    }
    tile.appendChild(stack);
    return tile;
}

function renderCalendar() {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const today = new Date();
    const todayInMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
    const monthPrefix = year + "-" + String(monthIndex + 1).padStart(2, "0");
    const movies = historyMovies.filter(function (movie) {
        return movie.date.startsWith(monthPrefix + "-");
    });
    const moviesByDate = new Map();
    for (const movie of movies) {
        if (!moviesByDate.has(movie.date)) {
            moviesByDate.set(movie.date, []);
        }
        moviesByDate.get(movie.date).push(movie);
    }
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    monthLabel.textContent = year + ". " + (monthIndex + 1);
    calendarDays.replaceChildren();

    for (let blank = 0; blank < firstDay; blank++) {
        const cell = document.createElement("li");
        cell.setAttribute("aria-hidden", "true");
        calendarDays.appendChild(cell);
    }
    for (let day = 1; day <= dayCount; day++) {
        const cell = document.createElement("li");
        const date = monthPrefix + "-" + String(day).padStart(2, "0");
        const dayMovies = moviesByDate.get(date);
        const isToday = todayInMonth && day === today.getDate();
        if (dayMovies) {
            const tile = makeCalendarPoster(date, dayMovies);
            if (isToday) {
                tile.setAttribute("aria-current", "date");
            }
            cell.appendChild(tile);
        } else {
            cell.className = "mypage-calendar-day-number";
            cell.textContent = day;
            if (isToday) {
                cell.setAttribute("aria-current", "date");
            }
        }
        calendarDays.appendChild(cell);
    }
}

function changeMonth(offset) {
    month = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    renderCalendar();
}

document.querySelector(".mypage-month-prev").addEventListener("click", function () {
    changeMonth(-1);
});
document.querySelector(".mypage-month-next").addEventListener("click", function () {
    changeMonth(1);
});

renderCalendar();
fetch("data/4_CINEON_movies.json")
    .then(function (response) {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        return response.json();
    })
    .then(function (catalog) {
        wishMovies = catalog.now;
        renderWishes();
    })
    .catch(function (error) {
        console.warn("좋아요 영화 목록을 불러오지 못했습니다.", error);
    });

loadWatched()
    .then(function (movies) {
        historyMovies = movies.sort(function (first, second) {
            return second.date.localeCompare(first.date);
        });
        renderHistory();
        renderCalendar();
        renderRatings();
        renderWishes();
        shareProfile.disabled = false;
    })
    .catch(function (error) {
        document.querySelector(".mypage-record-note").textContent = "관람 기록을 불러오지 못했습니다.";
        console.error("마이페이지 관람 기록 로드 오류:", error);
    });

window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
        renderRatings();
        renderWishes();
    }
});

window.addEventListener("storage", function () {
    renderRatings();
    renderWishes();
});
