document.addEventListener('DOMContentLoaded',function(){const tickerWrapper=document.querySelector('.ticker-wrapper');const stockTicker=document.querySelector('.stock-ticker');const tickerDisclaimer=document.querySelector('.ticker-disclaimer');if(!stockTicker)return;if(!tickerWrapper)return;async function fetchTickerData(){try{const response=await fetch('/wp-json/tasi-ticker/v1/stocks/latest');const data=await response.json();if(data&&data.prices){tickerWrapper.innerHTML=data.prices.map(tickerItem=>`
                    <div class="ticker-item">
                        <span class="ticker-name">${tickerItem['name_' + settings.current_language]}</span>
                        <span class="ticker-change text-${tickerItem.trend === 'up' ? 'success' : 'danger'}">▲</span>
                        <span class="ticker-value text-${tickerItem.trend === 'up' ? 'success' : 'danger'}">${parseFloat(tickerItem.latest_close).toFixed(2)}</span>
                    </div>
                `).join('');stockTicker.classList.remove('visually-hidden');tickerDisclaimer.classList.remove('visually-hidden')}}catch(error){console.error('Error fetching ticker data:',error)}}
fetchTickerData()})
;