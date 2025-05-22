import React, { useState } from 'react';
import { Send, Search, Clock, Phone, VideoIcon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Project, Message } from '../types';

const MessagesPage: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>('1');
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock projects data
  const projectsData: Project[] = [
    {
      id: '1',
      title: 'Kitchen Remodeling - Johnson Residence',
      description: 'Complete kitchen renovation including cabinets, countertops, and appliances',
      clientId: 'client1',
      status: 'in-progress',
      createdAt: '2025-05-15T10:00:00Z',
      updatedAt: '2025-05-17T14:30:00Z',
      quote: 15000,
      assignedEmployees: ['emp1', 'emp2', 'emp3'],
      visits: [],
    },
    {
      id: '2',
      title: 'Bathroom Renovation - Smith Family',
      description: 'Master bathroom upgrade with new shower, vanity, and fixtures',
      clientId: 'client2',
      status: 'pending',
      createdAt: '2025-05-10T08:15:00Z',
      updatedAt: '2025-05-10T16:45:00Z',
      quote: 8500,
      assignedEmployees: ['emp2'],
      visits: [],
    },
    {
      id: '3',
      title: 'Deck Construction - Miller Backyard',
      description: 'New outdoor deck with composite decking and railing',
      clientId: 'client3',
      status: 'completed',
      createdAt: '2025-04-20T09:30:00Z',
      updatedAt: '2025-05-05T11:15:00Z',
      quote: 12000,
      assignedEmployees: ['emp1', 'emp3'],
      visits: [],
    },
  ];

  // Mock messages data
  const messagesData: Record<string, Message[]> = {
    '1': [
      {
        id: 'm1',
        projectId: '1',
        senderId: 'admin1',
        content: 'Hi there! I wanted to confirm our visit scheduled for next week.',
        timestamp: '2025-05-16T10:15:00Z',
        read: true,
      },
      {
        id: 'm2',
        projectId: '1',
        senderId: 'client1',
        content: 'Yes, that works for me. Do you need me to prepare anything?',
        timestamp: '2025-05-16T10:25:00Z',
        read: true,
      },
      {
        id: 'm3',
        projectId: '1',
        senderId: 'emp1',
        content: 'Just make sure the area is accessible. We\'ll bring all the necessary tools and materials.',
        timestamp: '2025-05-16T10:40:00Z',
        read: true,
      },
      {
        id: 'm4',
        projectId: '1',
        senderId: 'client1',
        content: 'Perfect! I\'ll make sure everything is clear. Will the entire team be coming?',
        timestamp: '2025-05-16T11:05:00Z',
        read: true,
      },
      {
        id: 'm5',
        projectId: '1',
        senderId: 'admin1',
        content: 'Yes, we\'ll have 3 team members on site. Should take about 4-5 hours for the initial work.',
        timestamp: '2025-05-16T11:15:00Z',
        read: true,
      },
    ],
    '2': [
      {
        id: 'm6',
        projectId: '2',
        senderId: 'admin1',
        content: 'Hello! I wanted to discuss the material options for your bathroom renovation.',
        timestamp: '2025-05-15T14:30:00Z',
        read: true,
      },
      {
        id: 'm7',
        projectId: '2',
        senderId: 'client2',
        content: 'Great! I\'ve been looking at some tile options. When can we meet to go over them?',
        timestamp: '2025-05-15T15:45:00Z',
        read: true,
      }
    ],
    '3': [
      {
        id: 'm8',
        projectId: '3',
        senderId: 'emp3',
        content: 'Just wanted to let you know we\'ve completed the deck construction. Everything looks great!',
        timestamp: '2025-05-05T16:20:00Z',
        read: true,
      },
      {
        id: 'm9',
        projectId: '3',
        senderId: 'client3',
        content: 'Amazing! It looks even better than I imagined. Thank you for the excellent work!',
        timestamp: '2025-05-05T17:10:00Z',
        read: true,
      },
    ]
  };

  // Filter projects based on search query
  const filteredProjects = projectsData.filter(project => 
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get messages for selected project
  const currentMessages = selectedProject ? (messagesData[selectedProject] || []) : [];

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Send message handler
  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedProject) return;
    
    // In a real app, this would send to an API
    console.log('Sending message:', messageText, 'to project:', selectedProject);
    setMessageText('');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
        {/* Projects List */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <div className="p-4 border-b">
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                fullWidth
              />
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredProjects.map(project => (
                <div
                  key={project.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedProject === project.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                  }`}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{project.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {project.description}
                      </p>
                    </div>
                    {messagesData[project.id] && messagesData[project.id].length > 0 && (
                      <div className="text-xs text-gray-500 flex items-center">
                        <Clock size={12} className="mr-1" />
                        {formatTime(messagesData[project.id][messagesData[project.id].length - 1].timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            {selectedProject ? (
              <>
                <div className="p-4 border-b flex justify-between items-center">
                  <div>
                    <h2 className="font-medium">
                      {projectsData.find(p => p.id === selectedProject)?.title}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {projectsData.find(p => p.id === selectedProject)?.status}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 rounded-full hover:bg-gray-100" aria-label="Phone call">
                      <Phone size={20} />
                    </button>
                    <button className="p-2 rounded-full hover:bg-gray-100" aria-label="Video call">
                      <VideoIcon size={20} />
                    </button>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
                  {currentMessages.map(message => {
                    const isAdmin = message.senderId.includes('admin');
                    const isClient = message.senderId.includes('client');
                    const isEmployee = message.senderId.includes('emp');
                    
                    let senderName = 'Unknown';
                    let bgColor = '';
                    let textAlign = '';
                    
                    if (isAdmin) {
                      senderName = 'You (Admin)';
                      bgColor = 'bg-teal-500 text-white';
                      textAlign = 'self-end';
                    } else if (isClient) {
                      senderName = 'Client';
                      bgColor = 'bg-blue-100 text-blue-800';
                      textAlign = 'self-start';
                    } else if (isEmployee) {
                      senderName = `Employee ${message.senderId.substring(3)}`;
                      bgColor = 'bg-gray-100 text-gray-800';
                      textAlign = 'self-start';
                    }
                    
                    return (
                      <div key={message.id} className={`max-w-xs ${textAlign}`}>
                        <div className="text-xs text-gray-500 mb-1">{senderName} • {formatTime(message.timestamp)}</div>
                        <div className={`p-3 rounded-lg ${bgColor}`}>
                          {message.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex">
                    <Input
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      fullWidth
                      className="mr-2"
                    />
                    <Button
                      variant="primary"
                      onClick={handleSendMessage}
                      rightIcon={<Send size={16} />}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-500">
                <div>
                  <p className="mb-2">Select a conversation to start messaging</p>
                  <p className="text-sm">Your project conversations will appear here</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;