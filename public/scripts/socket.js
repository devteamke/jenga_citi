
 var socket = io();

socket.on('connect', ()=>{
              socket.on('new-report/admin',function(data){
               
               
                var count =$('#last5').children().length
                 $('.notifNo').text(count);
              });
              socket.emit('fetch notifications no','',function(data){
                  console.log('[notifications count]',data)
                  var count = data.count;
                 $('.notifNo').text(count);
              })
                if(window.location.pathname=='/panel')
                {
                  //Chart data
                    socket.emit('fetch chart data','',function(data){
                        console.log('Data fetched ');
                        console.log(data);
                        var donlables=[];
                        data.donChart.forEach((chart)=>{
                          donlables.push(chart._id)
                        })
                        var doncount=[];
                        data.donChart.forEach((chart)=>{
                          doncount.push(chart.count)
                        })
                        //Donut chart
                        new Chart(document.getElementById("doughnut-chart"), {
                            type: 'bar',
                            data: {
                              labels: donlables,
                              datasets: [
                                {
                                  //label: "Population (millions)",
                                  backgroundColor: ["#ff0011", "#0099ff","#00cc00","#9900cc","#c45850","#b33c00","#c6538c","#ffc34d","#00ffcc",],
                                  data: doncount
                                }
                              ]
                            },
                            options: {
                              
                              cutoutPercentage: 70,
                              title: {
                                display: true,
                                text: 'Number of reports'
                              },
                              legend:{
                                display:false,
                                position:'bottom'
                              },
                             
                            }
                        });
                        //Polar chartchart
                         var pollables=[];
                        data.polar.forEach((chart)=>{
                          pollables.push(chart._id)
                        })
                        var polcount=[];
                        var color =[]
                        data.polar.forEach((chart)=>{
                          polcount.push(chart.count)
                          color.push(chart.color)
                        })
                        new Chart(document.getElementById("myChart").getContext('2d'), {
                            type: 'polarArea',
                            data: {
                              labels: pollables,
                              datasets: [
                                {
                                 
                                  backgroundColor: color,
                                  data: polcount
                                }
                              ]
                            },
                            options: {
                              title: {
                                display: true,
                                text: 'Distrubution of Reports According to Type'
                              },
                              legend:{
                                display:true,
                                position:'bottom',
                                label:{
                                  text:String,
                                  
                                }
                              },
                             
                            }
                        });
                        
                    });
                    //Report locations
                      socket.emit('fetch-report-locations',window.location.pathname,function(datas){
                    var locations = [
                      ['Illegal', -1.3952, 36.7409, 3],
                      ['all', -1.352, 36.7409, 2],
                      ['delete', -1.392, 36.7409, 1]
                    ];
                  console.log(datas)
                 // Initialize and add the map
                     initMap = function () {
                           var map = new google.maps.Map(document.getElementById('map2'), {
                            zoom: 11,
                            center: new google.maps.LatLng(-1.2804, 36.8163),
                            mapTypeId: google.maps.MapTypeId.ROADMAP
                          });
                    
                          var infowindow = new google.maps.InfoWindow();
                    
                          var marker, i;
                    
                          for (i = 0; i < datas.length; i++) {
                              marker = new google.maps.Marker({
                                position: new google.maps.LatLng(datas[i][1], datas[i][2]),
                                map: map,
                                icon:{
                                      path: google.maps.SymbolPath.CIRCLE,
                                      scale: 6.5,
                                      fillColor: datas[i][4],
                                      fillOpacity: 0.8,
                                      strokeWeight: 0.9
                                  }
                             });
                      
                              google.maps.event.addListener(marker, 'mouseover', (function(marker, i) {
                                return function() {
                                  infowindow.setContent(datas[i][0] + '<br> <a href="/reports_s/'+ datas[i][5]+'/view"> View report</>');
                                  infowindow.open(map, marker);
                                }
                              })(marker, i));
                          }
                    }
                    initMap();
                  });
                }
                if(window.location.pathname.search('/reports_s/SS')>-1){
                  socket.emit('fetch-location',window.location.pathname,function(data){
                    console.log(data);
                 // Initialize and add the map
                     initMap = function () {
                      // The location of Uluru
                      var uluru = {lat: parseFloat(data.lat), lng: parseFloat(data.long)};
                       var infowindow = new google.maps.InfoWindow();
                      // The map, centered at Uluru
                      var map = new google.maps.Map(
                          document.getElementById('map'), {zoom: 15, center: uluru});
                      // The marker, positioned at Uluru
                               var marker = new google.maps.Marker({
                        position: uluru, map: map,
                        icon:{
                                      path: google.maps.SymbolPath.CIRCLE,
                                      scale: 6.5,
                                      fillColor: data.color,
                                      fillOpacity: 0.8,
                                      strokeWeight: 0.9
                                  }
                      });
                        
                                  infowindow.setContent('Location of report ');
                                  infowindow.open(map, marker);
                             
                    }
                    initMap();
                  });
                }
                //On all locations fetch nofications
                // socket.emit('fetch notifications','',function(data){
                //   console.log('Notifications call back')
                //   console.log(data);
                // var   totalNotif = data[1].count+data[0].count;
                // $('.notifNo').text(totalNotif);
                // $('#newAdmin').text(data[0].count);
                // $('#newReport').text(data[1].count);
                // });
               
            });

socket.on('disconnect', ()=>{
                console.log('Disconnected from server');
});
