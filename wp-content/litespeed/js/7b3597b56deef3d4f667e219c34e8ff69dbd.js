(()=>{const state={searchText:"",startDate:"",endDate:"",currentPage:1,lang:"",elements:null,currentPosts:[],firstload:!0,totalPages:null,postType:"",fetching:!1,};const SELECTORS={postTypeInput:"input[type=hidden]",datePicker:"input[type='date']",startDate:"input[type='date'].start-date",endDate:"input[type='date'].due-date",textField:"input[type='text'].form-control",newsContainer:".news-container",paginationNextFive:".paginagtion-next-5",paginationNextOne:".paginagtion-next-1",paginationPreviousFive:".paginagtion-previous-5",paginationPreviousOne:".paginagtion-previous-1",currentPage:".paginagtion-current-page",title:".title.titleFont",noResultContainer:".no-results",numberPaginationItems:".pagination-number",};const init=()=>{try{initializeState();if(!validateElements())return;bindEvents()}catch(err){console.log(err)}};const initializeState=()=>{const postTypeInput=document.querySelector(SELECTORS.postTypeInput);const title=document.querySelector(SELECTORS.title);const filterInputText=document.querySelector(SELECTORS.textField);const startDateInput=document.querySelector(SELECTORS.startDate);const endDateInput=document.querySelector(SELECTORS.endDate);const newsContainer=document.querySelector(SELECTORS.newsContainer);const noResultsContainer=document.querySelector(SELECTORS.noResultContainer);const paginationPreviousFiveIcon=document.querySelector(SELECTORS.paginationPreviousFive);const paginationNextFiveIcon=document.querySelector(SELECTORS.paginationNextFive);const paginationPreviousOneIcon=document.querySelector(SELECTORS.paginationPreviousOne);const paginationNextOneIcon=document.querySelector(SELECTORS.paginationNextOne);const paginagtionCurrentPage=document.querySelector(SELECTORS.currentPage);if(!filterInputText||!startDateInput||!endDateInput||!newsContainer||!paginationPreviousFiveIcon||!paginationNextOneIcon||!paginationPreviousOneIcon||!paginationPreviousFiveIcon||!paginagtionCurrentPage||!title||!noResultsContainer||!postTypeInput)
return;state.elements={startDateInput,endDateInput,filterInputText,newsContainer,paginationPreviousFiveIcon,paginationNextFiveIcon,paginationPreviousOneIcon,paginationNextOneIcon,paginagtionCurrentPage,title,noResultsContainer,postTypeInput,};state.lang=settings.current_language;state.currentPosts=[];state.postType=postTypeInput.value;if(state.lang==="ar"){flatpickr(startDateInput,{locale:"ar",dateFormat:"Y/m/d",onChange:async function(selectedDates,dateStr,instance){state.startDate=dateStr.replaceAll("/","-");state.currentPage=1;await getData()},});flatpickr(endDateInput,{locale:"ar",dateFormat:"Y/m/d",onChange:async function(selectedDates,dateStr,instance){state.endDate=dateStr.replaceAll("/","-");state.currentPage=1;await getData()},})}
getData()};const validateElements=()=>{if(!state.elements){return!1}
const required=["filterInputText","startDateInput","endDateInput","newsContainer","paginationNextFiveIcon","paginationPreviousFiveIcon","paginationPreviousOneIcon","paginationNextOneIcon","paginagtionCurrentPage","postTypeInput",];return required.every((key)=>{if(!state.elements[key]){return!1}
return!0})};const debounce=(cb,delay=1000)=>{let timeout;return(...args)=>{clearTimeout(timeout);timeout=setTimeout(()=>{cb(args)},delay)}};const updateDebounceText=debounce(async(text)=>{state.searchText=text;state.currentPage=1;await getData()});const bindEvents=()=>{const{filterInputText,startDateInput,endDateInput,paginationPreviousFiveIcon,paginationNextFiveIcon,paginationPreviousOneIcon,paginationNextOneIcon,}=state.elements;filterInputText.addEventListener("input",(e)=>{updateDebounceText(e.target.value)});startDateInput.addEventListener("input",async(e)=>{state.startDate=e.target.value.replaceAll("/","-");state.currentPage=1;await getData()});endDateInput.addEventListener("input",async(e)=>{state.endDate=e.target.value.replaceAll("/","-");state.currentPage=1;await getData()});const changeCurrentPage=(newCurrentPage)=>{if(newCurrentPage<1||newCurrentPage>state.totalPages){return!1}
state.currentPage=newCurrentPage;return!0};paginationNextFiveIcon.addEventListener("click",async()=>{if(state.lang==="ar"){if(!changeCurrentPage(state.currentPage-5))return}else{if(!changeCurrentPage(state.currentPage+5))return}
await getData()});paginationNextOneIcon.addEventListener("click",async()=>{if(state.lang==="ar"){if(!changeCurrentPage(state.currentPage-1))return}else{if(!changeCurrentPage(state.currentPage+1))return}
await getData()});paginationPreviousFiveIcon.addEventListener("click",async()=>{if(state.lang==="ar"){if(!changeCurrentPage(state.currentPage+5))return}else{if(!changeCurrentPage(state.currentPage-5))return}
await getData()});paginationPreviousOneIcon.addEventListener("click",async()=>{if(state.lang==="ar"){if(!changeCurrentPage(state.currentPage+1)){return}}else{if(!changeCurrentPage(state.currentPage-1))return}
await getData()})};const formatDate=(dateString)=>{if(!dateString)return"";try{const date=new Date(dateString);if(isNaN(date.getTime()))return"";const formatOptions={day:"numeric",month:"long",year:"numeric",};const parts={day:new Intl.DateTimeFormat("en-US",{day:"numeric"}).format(date),month:new Intl.DateTimeFormat(state.lang,{month:"long"}).format(date),year:new Intl.DateTimeFormat("en-US",{year:"numeric"}).format(date),};return `${parts.day} ${parts.month} ${parts.year}`}catch(error){console.error("Error formatting date:",error);return""}};const getData=async()=>{if(state.fetching)return;const params=new URLSearchParams({page:state.currentPage,per_page:10,lang:state.lang,s:state.searchText,post_type:state.postType,});if(state.startDate){params.append("date_from",state.startDate)}
if(state.endDate){params.append("date_to",state.endDate)}
const searchURL=`/wp-json/musharaka/v1/posts?${params.toString()}`;try{state.fetching=!0;const response=await(await fetch(searchURL)).json();state.currentPosts=response.posts;state.totalPages=response.total_pages;if(response.total_posts===0){state.elements.noResultsContainer.classList.remove("d-none")}else{state.elements.noResultsContainer.classList.add("d-none")}
setupUI()}catch(err){console.log(err)}
state.fetching=!1};const setupUI=()=>{const lastContent=[];for(let i=0;i<state.currentPosts.length;i++){lastContent.push(buildNewsCard(state.currentPosts[i]))}
state.elements.newsContainer.innerHTML=lastContent.join("");state.elements.paginagtionCurrentPage.innerHTML=state.currentPage;if(state.firstload){state.firstload=!1;createPagination();return}
state.elements.title.scrollIntoView({behavior:"smooth"});createPagination()};const createPagination=()=>{const allContent=[];for(let i=0;i<state.totalPages;i++){if(i==state.totalPages-1&&state.currentPage<state.totalPages-3){allContent.push(`<span class='pagination-item'>. . .</span>`)}
allContent.push(`
        <span lang='en-us' class='pagination-number pagination-item ${
          i === 0 ||
          i + 1 === state.currentPage ||
          i + 1 === state.currentPage + 1 ||
          i + 1 === state.currentPage - 1 ||
          i === state.totalPages - 1
            ? ""
            : "d-none"
        } ${i + 1 === state.currentPage ? "pagination-selected" : ""}' > 
          ${i + 1}
 			  </span>
        `);if(i===0&&state.currentPage>2){allContent.push(`<span class='pagination-item'>. . .</span>`)}}
state.elements.paginagtionCurrentPage.innerHTML=allContent.join("");handlePaginationItemClick()};const buildNewsCard=(post)=>{return `
    <div class='col-md-6'>
    <div class="announcement-card-container h-100 ">
	<div class="row h-100">
		<div class="col-md-5">
			${
        post.thumbnail
          ? `<a href="${post.link}" title='${post.title}'><img src="${post.thumbnail}" alt='${post.title}' class="card-logo"></a>`
          : ""
      }	
		</div>
		<div class="col-md-7 card-text-section align-self-stretch d-flex flex-column justify-content-between">
			<div>
				<a href="${post.link}"  class="link-wrapper">
          <h5 class="announcement-title titleFont">${post.title}</h5>
        </a>
        <span class="announcement-date" lang="en">${formatDate(post.date)}</span>
				<p class="announcement-description">${post.excerpt ? post.excerpt : post.content}</p>
			</div>
			<div class="d-flex justify-content-between align-items-center">
				 <span class="announcement-date"></span>
				<a href="${post.link}" class="myBtn btn-read-more">
					${state.lang === "ar" ? "اكتشف المزيد" : "learn more"}
					<svg class="arrow" xmlns="http://www.w3.org/2000/svg" width="7.61" height="7.61" viewbox="0 0 13 12" fill="none">
						<path d="M11.8491 10.9497L1.94959 1.05025M1.94959 1.05025V10.9497M1.94959 1.05025H11.8491" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</a>
			</div>
		</div>
	</div>
</div>
</div>
`};const handlePaginationNext=()=>{};const handlePaginationPrev=()=>{};const handlePaginationNextFive=()=>{};const handlePaginationPrevOne=()=>{};const handlePaginationItemClick=()=>{document.querySelectorAll(SELECTORS.numberPaginationItems).forEach((item)=>{item.addEventListener("click",async(e)=>{state.currentPage=+e.target.innerHTML;await getData()})})};if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init)}else{init()}})()
;