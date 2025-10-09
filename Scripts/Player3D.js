// 3D Cube Music Player JavaScript
// Basic functionality for play/pause, progress simulation, and controls

document.addEventListener('DOMContentLoaded', function() {
    const playBtn = document.getElementById('play-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progress = document.querySelector('.progress');
    const currentTimeSpan = document.getElementById('current-time');
    const totalTimeSpan = document.getElementById('total-time');
    const cube = document.querySelector('.cube');

    let isPlaying = false;
    let progressInterval;
    let currentTime = 0;
    const totalTime = 212; // 3:32 in seconds

    
    playBtn.addEventListener('click', function() {
        isPlaying = !isPlaying;
        const icon = playBtn.querySelector('i');

        if (isPlaying) {
            icon.className = 'bx bx-pause';
            startProgress();
            cube.style.animationPlayState = 'running';
        } else {
            icon.className = 'bx bx-play';
            stopProgress();
            cube.style.animationPlayState = 'paused';
        }
    });

  
    document.querySelector('.prev-btn').addEventListener('click', function() {
       
        console.log('Previous song');
    });

    
    document.querySelector('.next-btn').addEventListener('click', function() {
        
        console.log('Next song');
    });

   
    progressBar.addEventListener('click', function(e) {
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        currentTime = percentage * totalTime;
        updateProgress();
        updateTimeDisplay();
    });

    function startProgress() {
        progressInterval = setInterval(function() {
            currentTime += 1;
            if (currentTime >= totalTime) {
                currentTime = 0;
                isPlaying = false;
                playBtn.querySelector('i').className = 'bx bx-play';
                cube.style.animationPlayState = 'paused';
                stopProgress();
            }
            updateProgress();
            updateTimeDisplay();
        }, 1000);
    }

    function stopProgress() {
        clearInterval(progressInterval);
    }

    function updateProgress() {
        const percentage = (currentTime / totalTime) * 100;
        progress.style.width = percentage + '%';
    }

    function updateTimeDisplay() {
        const currentFormatted = formatTime(currentTime);
        const totalFormatted = formatTime(totalTime);
        currentTimeSpan.textContent = currentFormatted;
        totalTimeSpan.textContent = totalFormatted;
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Initialize time display
    updateTimeDisplay();
});
