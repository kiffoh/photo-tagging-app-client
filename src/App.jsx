import { useEffect, useState, Fragment } from 'react'
import './App.css'
import parakeetPicture from './assets/Pensive Parakeet.jpg'
import parakeetIcon from './assets/parakeet icon.png'
import knightIcon from './assets/knight icon.png'
import kingIcon from './assets/king icon.png'
import { v4 as uuidv4 } from 'uuid';

const backendUrl = import.meta.env.VITE_SERVER_URL;

function App() {
  const [coordinates, setCoordinates] = useState([]) // Current guess
  const [highlightedIcon, setHighlightedIcon] = useState('parakeet'); // Tracks selected character
  const [availableIcons, setAvailableIcons] = useState(['parakeet', 'knight', 'king']) // Determines which icons have not been found
  const [correctGuess, setCorrectGuess] = useState(false); // Updates the colour of the animation

  const [imageSize, setImageSize] = useState({ width: 0, height: 0, x1: 0, y1: 0, x2 : 0, y2 : 0 }); // Used for % guess on image

  const [iconCoordinates, setIconCoordinates] = useState({}); // Recives coordinates for all icons from Backend

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [allIconsFound, setAllIconsFound] = useState(false); // Tracks overall game state
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(null);
  const [newHighScore, setNewHighScore] = useState(false);
  const [currentHighScores, setCurrentHighScores] = useState([])
  const [userName, setUserName] = useState('')
  const [resetAvailable, setResetAvailable] = useState(false);

  useEffect(() => {
    async function getAllIconPercentages() {
      try{
        const response = await fetch(`${backendUrl}/recieve-icon-data`);
        if (response.ok) {
          const data = await response.json();
          setIconCoordinates(data);
        } else {
        setError('There was an error fetching the icon data')
        }
      } catch(err) {
        setError('An unknown error occurred.')
      } finally {
        setLoading(false); 
      }
    }

    async function getHighScores() {
      try {
        const response = await fetch(`${backendUrl}/current-high-scores`);
        if (response.ok) {
          const data = await response.json()
          setCurrentHighScores(data);
        } else {
          setError('There was an error fetching the high score data')
        }
      } catch(err) {
        setError('An unknown error occurred.')
      }
    }

    getAllIconPercentages();
    getHighScores();
  }, [])
  
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 2000); // Error will disappear after 3 seconds

      return () => clearTimeout(timer); // Cleanup the timeout if the error changes or component unmounts
    }
  }, [error]);

  function logCoordinates(event) {
    event.preventDefault();

    const x = event.clientX + window.scrollX;
    const y = event.clientY + window.scrollY;

    guess(x, y);

    setCoordinates([{x, y, key: Date.now()}]);
  }

  async function guess(xGuess, yGuess) {
    const {width, height, x1, y1, x2, y2} = imageSize;

    
    if (width === 0 || height === 0) {
      setError('Image size is not set properly')
      console.log('Image size is not set properly');
      return;
    }

    const relativeX = ((xGuess - x1 ) / width * 100).toFixed(2);
    const relativeY = ((yGuess - y1 ) / height * 100).toFixed(2);

    const icon = iconCoordinates[highlightedIcon];
    if (icon) {
      let isCorrectGuess = false;

      for (let i=0; i < icon.length; i++) {
        const { minX, maxX, minY, maxY } = icon[i];

        if (relativeY >= minY && relativeY <= maxY && relativeX >= minX && relativeX <= maxX) {
          isCorrectGuess = true;
          break; // Exit loop as soon as a match is found
        }
      }
      setCorrectGuess(isCorrectGuess);
      toggleIconUnavailable(isCorrectGuess);
    } else {
      setCorrectGuess(false); // Icon not found
      setError('Icon not found')
    }
  }

  // Calculate image size when the image loads
  function handleImageLoad() {
    calculateImageSize();
  }

  function calculateImageSize() {
    const imgElement = document.querySelector('.parakeet.picture');
    if (imgElement) {
      const rect = imgElement.getBoundingClientRect();
      setImageSize({
        width: rect.width,
        height: rect.height,
        x1: rect.left + window.scrollX,
        y1: rect.top + window.scrollY,
        x2: rect.right + window.scrollX,
        y2: rect.bottom + window.scrollY,
      });
    }
  }

  useEffect(() => {
    window.addEventListener('resize', calculateImageSize);

    return () => {
      window.removeEventListener('resize', calculateImageSize);
    };
  }, []);

  function toggleIconUnavailable(isCorrectGuess) {
    if (isCorrectGuess && availableIcons.length >= 1) {
      setAvailableIcons((prevIcons) => {
        const updatedIcons = prevIcons.filter(icon => icon !== highlightedIcon);
        if (updatedIcons.length === 0) {
          setAllIconsFound(true);
        } else {
          setHighlightedIcon(updatedIcons[0])
        }
        return updatedIcons;
      });
    }
  }

  function toggleHighlightedIcon(icon) {
    if (availableIcons.includes(icon)) {
      setHighlightedIcon(icon);
      if (error.includes('Icon')) setError(null);
    } else {
      // Trigger animation to show that the icon has already been found
      setError('Icon already found')
    }
  }

  useEffect(() => {
    if (startTime === null && availableIcons.length === 3) {
      setStartTime(Date.now())
    }
    if (elapsedTime === null && allIconsFound) {
      const endTime = Date.now();
      const timeTaken = Math.floor((endTime - startTime) / 1000); // Time in seconds
      checkHighScores(timeTaken);

      const timeTakenMins = formatTime(timeTaken > 60 ? Math.round(timeTaken / 60) : 0);
      const timeTakenSeconds = formatTime(timeTaken % 60);

      setElapsedTime({
        tempKey: endTime,
        newTime: timeTaken,
        mins: timeTakenMins,
        secs: timeTakenSeconds});
    }
    
    function checkHighScores(newTime) {
      if (currentHighScores.length < 5) setNewHighScore(true);

      else if (newTime > currentHighScores[currentHighScores.length - 1].time_total) return;
      
      else setNewHighScore(true);
    }
  }, [availableIcons, allIconsFound, startTime, elapsedTime, currentHighScores])

  
  async function handleUpdateHighScores(event) {
    event.preventDefault();

    const trimmedUserName = userName.trim();
    setUserName(trimmedUserName); // Update state with trimmed username

    // Client side update
    const newScore = {
      tempKey: elapsedTime.key,
      userName: trimmedUserName,
      time_total: elapsedTime.newTime,
      time_mins: elapsedTime.mins,
      time_secs: elapsedTime.secs,
    };
    
    if (currentHighScores.length === 0) setCurrentHighScores([newScore]);
    else {
      let newHighScores = [...currentHighScores]; // Copy current high scores
      for (let i = 0; i < newHighScores.length; i++) {
        if (elapsedTime.newTime < newHighScores[i].time_total) {
          newHighScores.splice(i, 0, newScore); // Insert the new score
          break;
        }
      }

      // Edge case where new high score is least highest
      if (newHighScores == currentHighScores && currentHighScores[currentHighScores.length - 1].time_total >= newScore.time_total) {
        newHighScores.splice(newHighScores.length, 0, newScore); // Insert the new score
      }

      if (newHighScores.length > 5) {
        newHighScores = newHighScores.slice(0, 5); // Ensure the length doesn't exceed the original length
      }
  
      setCurrentHighScores(newHighScores); // Update state with new high scores
    }

    // Server side update
    try {
      const response = await fetch(`${backendUrl}/update-high-scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({userName: trimmedUserName, time_total: elapsedTime.newTime, time_mins: elapsedTime.mins, time_secs: elapsedTime.secs})
      })
      if (!response.ok) {
        throw new Error('Error updating leaderboard');
      } else {
        setResetAvailable(true);
      }
    } catch (err) {
      setError('An unknown error occurred when updating the leaderboard')
    }
  }

  function formatTime(time) {
    return time.toString().length <= 1 ? "0" + time.toString() : time.toString();
  }

  function resetGame() {
    setAvailableIcons(['parakeet', 'knight', 'king']);
    setAllIconsFound(false);
    setStartTime(null);
    setElapsedTime(null);
    setNewHighScore(false);
    setUserName('');
    setCorrectGuess(false);
    setHighlightedIcon('parakeet');
    setCoordinates([]);
    setResetAvailable(false);
  }

  if (loading) return <h1>Loading...</h1>

  return (
    <>
      <h1>Find all the items!</h1>
      {error && (<h3 style={{
                            color:'red',
                            opacity: error ? 1 : 0,
                            transform: error ? 'translateY(0)' : 'translateY(-10px)',
                            transition: 'opacity 0.5s ease, transform 0.5s ease',
                            }}>{error}</h3>)}
      <div className='itemsContainer' style={{ position: 'relative' }}>
        {/* Parent container wrapping both iconContainer and imgContainer */}
        <div className='contentWrapper' style={{ position: 'relative', padding: '20px', boxSizing: 'border-box' }}>
          <div className='iconContainer'>
            <img 
              src={parakeetIcon}
              className={`parakeet-icon ${highlightedIcon === 'parakeet' ? 'highlighted' : ''}`}
              onClick={()=> toggleHighlightedIcon('parakeet')}
              draggable='false'
              ></img>
            <img
              src={knightIcon}
              className={`knight-icon ${highlightedIcon === 'knight' ? 'highlighted' : ''}`}
              onClick={()=> toggleHighlightedIcon('knight')}
              draggable='false'
              ></img>
            <img
              src={kingIcon}
              className={`king-icon ${highlightedIcon === 'king' ? 'highlighted' : ''}`}
              onClick={()=> toggleHighlightedIcon('king')}
              draggable='false'
            ></img>
          </div>
          <div className='imgContainer'>
            <img src={parakeetPicture} className='parakeet picture' onClick={logCoordinates} draggable='false' onLoad={handleImageLoad}></img>
          </div>
        </div>
  
        {allIconsFound && elapsedTime ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: '20px', // Adjust padding to fit your needs
              backgroundColor: 'rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              display: `${allIconsFound ? 'flex' : 'none'}`,
              flexDirection: 'column',
              boxSizing: 'border-box',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'whitesmoke',
              textShadow: `
                -2px -2px 0 green, 
                2px -2px 0 green, 
                -2px 2px 0 green, 
                2px 2px 0 green
              `,
            }}
          > {newHighScore ? 
            (
              <div style={{pointerEvents:'auto'}}>
                <h1>{elapsedTime.mins} : {elapsedTime.secs}</h1>
                <h1>A new High Score!</h1>
                <div className='leaderboard-grid'>
                  <h3 className='username'>User</h3>
                  <h3 className='leaderboard-time'>Time</h3>
                  {currentHighScores.map((score) => (
                    
                    <Fragment key={uuidv4()}>
                      <h3>{score.userName}</h3>
                      <h3>{score.time_mins + " : " + score.time_secs}</h3>
                    </Fragment>
                  )
                  )}
                  {resetAvailable ? <button onClick={resetGame} className='reset-btn'>Reset Game</button> : (
                    <form onSubmit={handleUpdateHighScores} className='add-new-score'>
                      <input 
                        type='text'
                        name='userName'
                        placeholder='Name'
                        onChange={e => setUserName(e.target.value)}
                        value={userName}
                      ></input>
                      <button type='submit'>Add Score</button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h1>Congratulations</h1>
                <h3>you found everything in:</h3> 
                <h3>{elapsedTime.mins + " : " + elapsedTime.secs}</h3>
                <button onClick={resetGame} className='reset-btn' style={{pointerEvents:'auto'}}>Reset Game</button>
              </>
            )}
          </div>
        ) : null}
      </div>
  
      {!allIconsFound && coordinates.map((coordinate) => (        
        <div
          key={coordinate.key}
          style={{
            position: 'absolute',
            left: `${coordinate.x}px`,
            top: `${coordinate.y}px`,
            transform: 'translate(-50%, -50%)',
            fontSize: '40px',
            cursor: 'default', 
            userSelect: 'none',
          }}
          className={`user-guess ${correctGuess ? 'correct' : ''}`}
        >
          ○
        </div>
      ))}
    </>
  )
  
}

export default App
