import React, { useState, useEffect } from 'react';
import { Camera, Save, Mic, MicOff } from 'lucide-react';

export default function Home() {
  const [items, setItems] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        const lowerTranscript = currentTranscript.toLowerCase();
        if (lowerTranscript.includes('next issue') || 
            lowerTranscript.includes('save this') || 
            lowerTranscript.includes('save and continue')) {
          processVoiceCommand();
          setTranscript('');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognition);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const processVoiceCommand = () => {
    const lowerTranscript = transcript.toLowerCase();
    const roomMatch = lowerTranscript.match(/(?:in|room|at) the (.*?)(?: there is|\.|\n|$)/);
    const room = roomMatch ? roomMatch[1].trim() : currentRoom;

    const newItem = {
      room,
      issue: transcript,
      notes: '',
      images: [],
      id: Date.now(),
      timestamp: new Date().toISOString()
    };

    setItems(prev => [...prev, newItem]);
    setCurrentRoom(room);
    setTranscript('');
  };

  const handleImageUpload = async (e, itemId) => {
    const files = Array.from(e.target.files);
    const readers = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    const images = await Promise.all(readers);
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, images: [...item.images, ...images] }
          : item
      )
    );
  };

  const downloadCSV = () => {
    const csvContent = [
      ['Timestamp', 'Room', 'Issue', 'Notes'].join(','),
      ...items.map(item => [
        item.timestamp,
        item.room,
        item.issue,
        item.notes
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snagging-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Voice Snagging List</h1>
            <div className="space-x-2">
              <button
                onClick={toggleListening}
                className={`p-2 rounded-full ${isListening ? 'bg-red-500' : 'bg-blue-500'} text-white`}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button
                onClick={downloadCSV}
                className="bg-green-500 text-white p-2 rounded-full"
              >
                <Save size={24} />
              </button>
            </div>
          </div>
        </div>

        {isListening && (
          <div className="p-4 bg-blue-50">
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Listening... {transcript}</span>
                <button
                  onClick={processVoiceCommand}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  disabled={!transcript}
                >
                  Save & Next
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Say your note, then either:
                - Click "Save & Next"
                - Or say "next issue" or "save and continue"
              </p>
            </div>
          </div>
        )}

        <div className="p-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500">
              No items yet. Click the microphone to start recording issues.
            </p>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{item.issue}</h3>
                      <p className="text-sm text-gray-600">{item.room}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="cursor-pointer bg-blue-500 text-white p-2 rounded-full">
                        <Camera size={20} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, item.id)}
                          className="hidden"
                          multiple
                          capture="environment"
                        />
                      </label>
                      {item.images.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {item.images.length} photo{item.images.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {item.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Issue ${index + 1}`}
                          className="rounded object-cover h-32 w-full"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
