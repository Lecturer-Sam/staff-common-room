import { useState } from 'react'
import {
  AlertTriangle, Bot, BookOpen, Box, Braces, Check, ChevronDown, ChevronRight, CircleUserRound,
  Code2, Command, Copy, Database, FileCode2, Files, GitBranch, GitMerge, GraduationCap,
  HardDrive, HelpCircle, Keyboard, LayoutGrid, Layers, Lightbulb, Lock, Maximize2,
  MessageSquareText, MoreHorizontal, PanelLeft, Play, Repeat, Search, Settings, Shuffle,
  ShieldAlert, Sparkles, Terminal, TerminalSquare, Upload, X, Zap
} from 'lucide-react'

const curriculum = [
  { id:'beginner', name:'BEGINNER', color:'#34d399', progress:20, items:[
    {id:'variables', title:'Variables & Data Types', icon:Box, done:true, duration:'8 min'},
    {id:'functions', title:'Functions', icon:Braces, done:false, duration:'12 min'},
    {id:'conditionals', title:'Conditionals', icon:GitBranch, done:false, duration:'10 min'},
    {id:'loops', title:'Loops', icon:Repeat, done:false, duration:'10 min'},
    {id:'arrays', title:'Arrays & Objects', icon:LayoutGrid, done:false, duration:'15 min'},
  ]},
  { id:'intermediate', name:'INTERMEDIATE', color:'#fbbf24', progress:0, items:[
    {id:'dom', title:'DOM Manipulation', icon:Code2, duration:'18 min'},
    {id:'userInputBrowser', title:'User Input (Forms)', icon:Keyboard, duration:'12 min'},
    {id:'async', title:'Async JavaScript', icon:Zap, duration:'20 min'},
    {id:'arrayOperations', title:'Array Operations', icon:Shuffle, duration:'14 min'},
    {id:'classes', title:'Classes & OOP', icon:Box, duration:'16 min'},
    {id:'encapsulation', title:'Encapsulation', icon:Lock, duration:'14 min'},
    {id:'scope', title:'Scope & Closures', icon:Layers, duration:'14 min'},
    {id:'errorHandling', title:'Error Handling', icon:ShieldAlert, duration:'12 min'},
    {id:'localStorage', title:'Browser Storage', icon:HardDrive, duration:'10 min'},
  ]},
  { id:'expert', name:'EXPERT', color:'#c084fc', progress:0, items:[
    {id:'inheritance', title:'Inheritance', icon:GitMerge, duration:'16 min'},
    {id:'patterns', title:'Design Patterns', icon:Sparkles, duration:'25 min'},
    {id:'performance', title:'Performance', icon:Zap, duration:'22 min'},
    {id:'internals', title:'JS Engine Internals', icon:Command, duration:'30 min'},
    {id:'userInputNode', title:'Input in Node.js', icon:Terminal, duration:'10 min'},
    {id:'fileBlob', title:'Reading Files (File API)', icon:Upload, duration:'16 min'},
    {id:'jsDatabase', title:'Building a Mock Database', icon:Database, duration:'18 min'},
  ]},
]

const lessons = {
  variables: {
    title:'Variables & Data Types', level:'BEGINNER', num:'01',
    description:'Learn how JavaScript stores and works with different kinds of information.',
    why:'Every app you\'ve ever used — a login form, a shopping cart, a game score — is really just variables being created, read, and updated. This is the vocabulary everything else in the course builds on.',
    mistake:'Beginners often use let everywhere "just in case." Default to const — if you get an error saying you can\'t reassign it, that\'s JavaScript protecting you from an accidental bug, not blocking you.',
    tip:'Try changing "Alex" to your own name, then change isLearning to false and guess what changes in the output before you run it.',
    code:[
      ['c','// Variables are containers for storing data'],
      ['k','const',' language = ', 's','"JavaScript"',';'],
      ['k','let',' year = ', 'n','2025',';'],
      ['k','let',' isAwesome = ', 'b','true',';'],
      [],
      ['c','// JavaScript has several data types'],
      ['k','const',' student = {'],
      ['plain','  name: ', 's','"Alex"',','],
      ['plain','  age: ', 'n','24',','],
      ['plain','  skills: [', 's','"HTML"',', ', 's','"CSS"',', ', 's','"JS"','],'],
      ['plain','  isLearning: ', 'b','true'],
      ['plain','};'],
      [],
      ['f','console.log','(', 's','`I am learning ${language}!`',');'],
    ],
    notes:{
      1:'const means this value can never be reassigned later in the code. Use it as your default.',
      2:'let is for values that will change — like a year counter, or a score that updates.',
      9:'This is an array — an ordered list inside square brackets, holding three string values.',
    },
    output:['I am learning JavaScript!'],
    quiz:{ q:'Which keyword should you reach for first, by default?', options:['let, because it\'s more flexible','const, unless you know the value will change','var, because it\'s the original keyword'], answer:1 },
  },
  functions: {
    title:'Functions', level:'BEGINNER', num:'02',
    description:'Create reusable blocks of code that perform focused tasks.',
    why:'Functions are how you avoid writing the same logic five times. Any time you see repeated code — validating an email, formatting a price, greeting a user — that\'s a function waiting to happen.',
    mistake:'Forgetting the return keyword is one of the most common early bugs — the function runs, but silently gives back undefined instead of the value you expected.',
    tip:'Call greet() twice with two different names and log both results — notice the function body never changes, only the input does.',
    code:[
      ['c','// A function accepts input and returns output'],
      ['k','function',' greet(', 'plain','name',') {'],
      ['k','  return',' ', 's','`Hello, ${name}!`',';'],
      ['plain','}'], [],
      ['k','const',' message = ', 'f','greet','(', 's','"Ada"',');'],
      ['f','console.log','(', 'plain','message',');'],
    ],
    notes:{
      1:'"name" here is a parameter — a placeholder that gets filled in with whatever you pass when you call the function.',
      2:'return is what hands the value back to whoever called the function. Without it, the function gives back undefined.',
    },
    output:['Hello, Ada!'],
    quiz:{ q:'What happens if you remove the "return" keyword from greet()?', options:['Nothing changes, it still works the same','message becomes undefined','JavaScript throws an error'], answer:1 },
  },
  conditionals:{
    title:'Conditionals', level:'BEGINNER', num:'03',
    description:'Make smart decisions in your programs with conditional logic.',
    why:'Conditionals are how software reacts to the real world — checking if a password is correct, if a cart total qualifies for free shipping, or if a user is allowed to see a page.',
    mistake:'Mixing up = (assignment) with === (comparison) is one of the most common bugs in JavaScript — one sets a value, the other checks one.',
    tip:'Change score to 65 and predict which branch runs before you hit Run Code.',
    code:[
      ['k','const',' score = ', 'n','87',';'],
      [],
      ['k','if',' (score >= ', 'n','80',') {'],
      ['f','  console.log','(', 's','"Great work!"',');'],
      ['plain','} ', 'k','else',' {'],
      ['f','  console.log','(', 's','"Keep learning!"',');'],
      ['plain','}']
    ],
    notes:{
      2:'>= means "greater than or equal to." Only one of the two branches below will ever run.',
    },
    output:['Great work!'],
    quiz:{ q:'If score were exactly 80, which message would print?', options:['"Great work!"','"Keep learning!"','Neither, it would error'], answer:0 },
  },
  loops:{
    title:'Loops', level:'BEGINNER', num:'04',
    description:'Repeat actions automatically instead of writing the same line over and over.',
    why:'Loops are how you process lists of things — sending an email to every user, calculating a total across every cart item, or checking every row in a spreadsheet.',
    mistake:'Forgetting to update the loop counter (like i++) creates an infinite loop, which can freeze or crash your program.',
    tip:'Add a fourth name to the students array and re-run — both loops handle it automatically, no code changes needed.',
    code:[
      ['k','const',' students = [', 's','"Ada"',', ', 's','"Grace"',', ', 's','"Alan"','];'],
      [],
      ['k','for',' (', 'k','let',' i = ', 'n','0',';i < students.length;i++) {'],
      ['f','  console.log','(', 's','`${i + 1}. ${students[i]}`',');'],
      ['plain','}'],
      [],
      ['c','// for...of is a simpler way to loop over arrays'],
      ['k','for',' (', 'k','const',' student of students) {'],
      ['f','  console.log','(', 's','`Hello, ${student}!`',');'],
      ['plain','}'],
    ],
    notes:{
      2:'i starts at 0 and keeps running while i < students.length — i++ increases i by one each pass.',
      7:'for...of hides the counter entirely — it just hands you each item directly, easier to read when you don\'t need the index.',
    },
    output:['1. Ada','2. Grace','3. Alan','Hello, Ada!','Hello, Grace!','Hello, Alan!'],
    quiz:{ q:'What happens if you forget i++ in the for loop?', options:['The loop runs once then stops','The loop never ends (infinite loop)','JavaScript throws an error immediately'], answer:1 },
  },
  arrays:{
    title:'Arrays & Objects', level:'BEGINNER', num:'05',
    description:'Organize related values into useful data collections.',
    why:'Arrays and objects are the backbone of real data — a list of products, a user\'s profile, an API response. Almost nothing interesting happens with just single variables.',
    mistake:'New developers often try to loop over an object with .map() directly — .map() only works on arrays. Objects need Object.keys() or Object.entries() first.',
    tip:'Add a fourth topic to the array, then log topics.length to see it update automatically.',
    code:[
      ['k','const',' topics = [', 's','"variables"',', ', 's','"functions"','];'],
      ['plain','topics.', 'f','map','(topic => topic.toUpperCase());']
    ],
    notes:{
      1:'.map() creates a brand new array — it doesn\'t change the original "topics" array.',
    },
    output:['[ "VARIABLES", "FUNCTIONS" ]'],
    quiz:{ q:'Does topics.map(...) change the original topics array?', options:['Yes, it modifies it in place','No, it returns a new array'], answer:1 },
  },
  dom:{
    title:'DOM Manipulation', level:'INTERMEDIATE', num:'06',
    description:'Use JavaScript to create and update interactive web pages.',
    why:'This is the difference between a static page and an app. Every button click, dropdown toggle, and live-updating counter you\'ve ever used comes from DOM manipulation.',
    mistake:'Calling querySelector before the page has finished loading returns null, and calling a method on null throws an error — this is why script tags are often placed at the end of the page.',
    tip:'Add a second addEventListener that logs the click count each time the button is pressed.',
    code:[
      ['k','const',' button = document.', 'f','querySelector','(', 's','"#start"',');'],
      ['plain','button.', 'f','addEventListener','(', 's','"click"',', () => {'],
      ['plain','  document.body.classList.', 'f','toggle','(', 's','"learning"',');'],
      ['plain','});']
    ],
    notes:{
      0:'querySelector finds the first element matching the CSS selector — here, an element with id="start".',
      1:'addEventListener doesn\'t run the function immediately — it waits and runs it only when the click happens.',
    },
    output:['Listening for clicks on #start…'],
    quiz:{ q:'What does button.querySelector("#start") return if no element has that id?', options:['An empty object','null','An error immediately'], answer:1 },
  },
  userInputBrowser:{
    title:'User Input (Forms)', level:'INTERMEDIATE', num:'07',
    description:'Capture what a user types or selects, and react to it in real time.',
    why:'Every login form, search bar, and settings toggle boils down to reading user input and responding to it — it\'s how a static page becomes something people can actually use.',
    mistake:'Forgetting event.preventDefault() on a form submit causes the page to reload immediately, wiping out anything JavaScript was about to do with the data.',
    tip:'Type into the input and notice event.target.value logs on every keystroke, not just on submit.',
    code:[
      ['k','const',' form = document.', 'f','querySelector','(', 's','"#signupForm"',');'],
      ['k','const',' input = document.', 'f','querySelector','(', 's','"#email"',');'],
      [],
      ['plain','input.', 'f','addEventListener','(', 's','"input"',', (event) => {'],
      ['f','  console.log','(', 's','`Typing: ${event.target.value}`',');'],
      ['plain','});'],
      [],
      ['plain','form.', 'f','addEventListener','(', 's','"submit"',', (event) => {'],
      ['plain','  event.', 'f','preventDefault','();', 'c',' // stop the page from reloading'],
      ['f','  console.log','(', 's','`Submitted: ${input.value}`',');'],
      ['plain','});']
    ],
    notes:{
      3:'The "input" event fires on every keystroke — great for live validation or a character counter.',
      8:'preventDefault() stops the browser\'s default full-page reload on submit, so your JavaScript can handle the data instead.',
    },
    output:['Typing: a','Typing: ad','Typing: ada@example.com','Submitted: ada@example.com'],
    quiz:{ q:'What happens if you forget event.preventDefault() in the submit handler?', options:['Nothing, submit still works the same','The page reloads before your code can use the input value','JavaScript throws an error'], answer:1 },
  },
  async:{
    title:'Async JavaScript', level:'INTERMEDIATE', num:'08',
    description:'Work with promises and asynchronous operations.',
    why:'Anything that takes time — fetching data from a server, reading a file, waiting on a timer — needs async code, or your whole page would freeze while it waits.',
    mistake:'Forgetting await before fetch() means you get a Promise object instead of the actual data, which trips up almost everyone the first time they use async code.',
    tip:'Notice the function is marked async — that\'s what allows the await keyword to work inside it.',
    code:[
      ['k','async function',' loadLesson() {'],
      ['k','  const',' response = ', 'k','await',' ', 'f','fetch','(', 's','"/api/lesson"',');'],
      ['k','  return',' response.', 'f','json','();'],
      ['plain','}']
    ],
    notes:{
      1:'await pauses this function (only this function) until the fetch finishes, without freezing the rest of the page.',
    },
    output:['{ title: "Loops", status: 200 }'],
    quiz:{ q:'What would response be if you forgot the "await" keyword?', options:['The actual JSON data','A pending Promise object','undefined'], answer:1 },
  },
  arrayOperations:{
    title:'Array Operations', level:'INTERMEDIATE', num:'09',
    description:'Transform, filter, and combine data using JavaScript\'s built-in array methods.',
    why:'Real data is messy — a list of orders you need to filter by status, transform into totals, or combine into one number. map, filter, and reduce are the everyday tools for exactly that, and they show up in nearly every job listing.',
    mistake:'Calling .filter() after .reduce() is a common ordering mistake — reduce collapses the array into a single value, so there\'s nothing left to filter afterward.',
    tip:'Add a fourth order under $20 and watch both the filtered list and the total update without touching the logic.',
    code:[
      ['k','const',' orders = ['],
      ['plain','  { item: ', 's','"Book"',', price: ', 'n','30',' },'],
      ['plain','  { item: ', 's','"Pen"',', price: ', 'n','5',' },'],
      ['plain','  { item: ', 's','"Laptop"',', price: ', 'n','900',' },'],
      ['plain','];'],
      [],
      ['c','// filter keeps only items matching a condition'],
      ['k','const',' expensive = orders.', 'f','filter','(o => o.price > ', 'n','20',');'],
      [],
      ['c','// map transforms every item'],
      ['k','const',' names = orders.', 'f','map','(o => o.item);'],
      [],
      ['c','// reduce collapses the array into one value'],
      ['k','const',' total = orders.', 'f','reduce','((sum, o) => sum + o.price, ', 'n','0',');'],
      ['f','console.log','(expensive, names, total);']
    ],
    notes:{
      7:'.filter() returns a new array containing only the items where the condition is true — here, price > 20.',
      10:'.map() returns a new array of the same length, with each item transformed — here, just the item name.',
      13:'.reduce() walks through the array building up a single value — sum starts at 0 and grows by each order\'s price.',
    },
    output:['[ { item: "Book", price: 30 }, { item: "Laptop", price: 900 } ]','[ "Book", "Pen", "Laptop" ]','935'],
    quiz:{ q:'What does .reduce() return in this example?', options:['A filtered array','A single number (the total)','A new array of names'], answer:1 },
  },
  classes:{
    title:'Classes & OOP', level:'INTERMEDIATE', num:'10',
    description:'Model behavior using modern JavaScript classes.',
    why:'Classes let you bundle data and behavior together — useful any time you\'re modeling real things in code: a Student, a Product, a GameCharacter, each with their own data and their own actions.',
    mistake:'Forgetting "new" when creating an instance (e.g. Student() instead of new Student()) leads to confusing errors — "new" is what actually builds the object.',
    tip:'Create a second student with a different name and call .learn() on both to see the same method produce different output.',
    code:[
      ['k','class',' Student {'],
      ['plain','  constructor(name) { ', 'k','this','.name = name; }'],
      ['plain','  learn() { ', 'k','return',' ', 's','`${this.name} is learning`','; }'],
      ['plain','}']
    ],
    notes:{
      1:'The constructor runs automatically whenever you create a new Student — it sets up the initial data.',
      2:'"this" refers to the specific student instance calling the method, so each student keeps its own name.',
    },
    output:['Alex is learning'],
    quiz:{ q:'What is the constructor for?', options:['Running code once when the class file loads','Setting up a new instance\'s initial data','Deleting an instance'], answer:1 },
  },
  encapsulation:{
    title:'Encapsulation', level:'INTERMEDIATE', num:'11',
    description:'Hide internal details of an object and expose only what\'s safe to use from outside.',
    why:'Encapsulation is what keeps a bank account\'s balance from being changed by any random code that touches it — you expose safe actions like deposit(), and hide the raw number itself.',
    mistake:'Making a property public (like this.balance) when it should be private lets any code silently change it, bypassing the checks encapsulation was meant to enforce — like preventing negative balances.',
    tip:'Try accessing acc.#balance directly from outside the class — private fields with # simply aren\'t reachable from out there.',
    code:[
      ['k','class',' BankAccount {'],
      ['plain','  #balance = ', 'n','0',';', 'c',' // # makes this private'],
      ['plain','  constructor(owner) { ', 'k','this','.owner = owner; }'],
      ['plain','  deposit(amount) {'],
      ['plain','    ', 'k','this','.#balance += amount;'],
      ['plain','  }'],
      ['plain','  getBalance() { ', 'k','return',' ', 'k','this','.#balance; }'],
      ['plain','}'],
      [],
      ['k','const',' acc = ', 'k','new',' BankAccount(', 's','"Ama"',');'],
      ['plain','acc.', 'f','deposit','(', 'n','100',');'],
      ['f','console.log','(acc.', 'f','getBalance','());']
    ],
    notes:{
      1:'The # prefix makes #balance a private field — it can only be accessed from inside this class, never from outside code.',
      6:'getBalance() is the only way outside code can read the balance — controlled access instead of direct access, which is encapsulation in action.',
    },
    output:['100'],
    quiz:{ q:'Why use #balance instead of just this.balance?', options:['It\'s faster to type','It makes the field private so outside code can\'t change it directly','It\'s required for all class properties'], answer:1 },
  },
  scope:{
    title:'Scope & Closures', level:'INTERMEDIATE', num:'12',
    description:'Understand which parts of your code can see which variables — and how functions can remember them.',
    why:'Scope explains why a variable declared inside one function is invisible to another — this is what keeps large codebases from turning into one giant tangle where everything can accidentally change everything else.',
    mistake:'Declaring a variable with var inside a block (like an if or for) leaks it outside that block, unlike let and const — a common source of confusing bugs.',
    tip:'Call counter() three times in a row and watch the count keep increasing — the inner function "remembers" count between calls.',
    code:[
      ['k','function',' createCounter() {'],
      ['k','  let',' count = ', 'n','0',';'],
      ['k','  return',' function() {'],
      ['plain','    count++;'],
      ['k','    return',' count;'],
      ['plain','  };'],
      ['plain','}'],
      [],
      ['k','const',' counter = ', 'f','createCounter','();'],
      ['f','console.log','(', 'f','counter','());'],
      ['f','console.log','(', 'f','counter','());'],
    ],
    notes:{
      1:'count lives inside createCounter\'s scope — code outside this function can\'t reach it directly.',
      2:'This inner function forms a closure — it keeps access to count even after createCounter has already finished running.',
    },
    output:['1','2'],
    quiz:{ q:'Why does calling counter() again keep increasing the number instead of resetting to 0?', options:['Because count is a global variable','Because the inner function forms a closure over count','Because JavaScript caches the last result'], answer:1 },
  },
  errorHandling:{
    title:'Error Handling', level:'INTERMEDIATE', num:'13',
    description:'Catch problems in your code gracefully instead of letting them crash the whole program.',
    why:'Anything that depends on the outside world — user input, a network request, a file — can fail. try/catch is how professional code keeps running (and tells the user what went wrong) instead of crashing entirely.',
    mistake:'Wrapping too much code in a single try block makes it hard to tell what actually failed — keep try blocks focused on the risky operation itself.',
    tip:'Change the second argument to divide() from 0 to 5 and see the catch block get skipped entirely.',
    code:[
      ['k','function',' divide(a, b) {'],
      ['k','  try',' {'],
      ['k','    if',' (b === ', 'n','0',') ', 'k','throw',' ', 'k','new',' Error(', 's','"Cannot divide by zero"',');'],
      ['k','    return',' a / b;'],
      ['plain','  } ', 'k','catch',' (error) {'],
      ['f','    console.log','(', 's','`Something went wrong: ${error.message}`',');'],
      ['k','    return',' ', 'k','null',';'],
      ['plain','  }'],
      ['plain','}'],
      [],
      ['f','console.log','(', 'f','divide','(', 'n','10',', ', 'n','0','));']
    ],
    notes:{
      2:'throw stops normal execution immediately and jumps straight to the nearest catch block.',
      4:'catch only runs if something inside try throws an error — otherwise it\'s skipped entirely.',
    },
    output:['Something went wrong: Cannot divide by zero','null'],
    quiz:{ q:'What does the throw keyword do?', options:['Logs a warning but keeps running normally','Immediately stops the try block and jumps to catch','Restarts the function from the top'], answer:1 },
  },
  localStorage:{
    title:'Browser Storage', level:'INTERMEDIATE', num:'14',
    description:'Save data in the browser so it survives a page refresh.',
    why:'localStorage is how a to-do app remembers your tasks after you close the tab, or a site remembers your theme preference — it\'s a simple key-value store built right into every browser.',
    mistake:'localStorage only stores strings — saving an object without JSON.stringify() first gives you the next-to-useless text "[object Object]" instead of your actual data.',
    tip:'Refresh the page after running this, then call localStorage.getItem("user") again — the data is still there, unlike a normal variable.',
    code:[
      ['k','const',' user = { name: ', 's','"Kwame"',', theme: ', 's','"dark"',' };'],
      [],
      ['c','// Objects must be converted to a string first'],
      ['plain','localStorage.', 'f','setItem','(', 's','"user"',', JSON.', 'f','stringify','(user));'],
      [],
      ['c','// ...and parsed back into an object when reading'],
      ['k','const',' saved = JSON.', 'f','parse','(localStorage.', 'f','getItem','(', 's','"user"','));'],
      ['f','console.log','(saved.name, saved.theme);']
    ],
    notes:{
      3:'JSON.stringify() turns the object into a plain string, which is the only type localStorage can store.',
      6:'JSON.parse() reverses that, turning the saved string back into a usable object.',
    },
    output:['Kwame dark'],
    quiz:{ q:'Why call JSON.stringify(user) before saving it?', options:['To make it load faster','Because localStorage can only store strings, not objects','It\'s optional, just a best practice'], answer:1 },
  },
  inheritance:{
    title:'Inheritance', level:'EXPERT', num:'15',
    description:'Let one class build on another, reusing shared behavior instead of duplicating it.',
    why:'Inheritance is how you model "is-a" relationships — a Manager is an Employee with extra abilities. You reuse the shared logic instead of copy-pasting it into every new class.',
    mistake:'Overusing inheritance for things that aren\'t truly "is-a" relationships leads to fragile, deeply nested class hierarchies — often composition (combining smaller pieces) is the simpler, more flexible choice.',
    tip:'Add a second subclass, like Contractor extends Employee, and give it its own version of describe().',
    code:[
      ['k','class',' Employee {'],
      ['plain','  constructor(name) { ', 'k','this','.name = name; }'],
      ['plain','  describe() { ', 'k','return',' ', 's','`${this.name} is an employee`','; }'],
      ['plain','}'],
      [],
      ['k','class',' Manager ', 'k','extends',' Employee {'],
      ['plain','  describe() {'],
      ['k','    return',' ', 'f','super','.describe() + ', 's','" who manages a team"',';'],
      ['plain','  }'],
      ['plain','}'],
      [],
      ['k','const',' m = ', 'k','new',' Manager(', 's','"Kwame"',');'],
      ['f','console.log','(m.', 'f','describe','());']
    ],
    notes:{
      5:'extends means Manager automatically gets everything Employee has, then can add or override its own behavior.',
      7:'super.describe() calls the parent class\'s version first, so you can build on it instead of rewriting it from scratch.',
    },
    output:['Kwame is an employee who manages a team'],
    quiz:{ q:'What does super.describe() do inside Manager\'s describe() method?', options:['Calls Manager\'s own describe() again (infinite loop)','Calls the parent Employee class\'s describe() method','Creates a new Employee instance'], answer:1 },
  },
  patterns:{
    title:'Design Patterns', level:'EXPERT', num:'16',
    description:'Build maintainable systems with proven architectural patterns.',
    why:'As apps grow, "just write more code" stops working. Patterns like this one (a simple store) are reusable solutions that keep large codebases predictable instead of tangled.',
    mistake:'Exposing "state" directly instead of through get()/set() means any code anywhere can silently change it, making bugs almost impossible to trace back to their source.',
    tip:'This pattern is the same core idea behind state-management libraries like Redux — a single controlled place to read and update data.',
    code:[
      ['k','const',' createStore = (initial) => {'],
      ['k','  let',' state = initial;'],
      ['k','  return',' { get: () => state, set: next => state = next };'],
      ['plain','};']
    ],
    notes:{
      2:'Returning get/set functions instead of the raw state is what keeps outside code from changing state directly.',
    },
    output:['{ get: [Function], set: [Function] }'],
    quiz:{ q:'Why return get() and set() instead of exposing "state" directly?', options:['It runs faster','It controls how and where state can be changed','It uses less memory'], answer:1 },
  },
  performance:{
    title:'Performance', level:'EXPERT', num:'17',
    description:'Profile, measure and optimize JavaScript workloads.',
    why:'Before optimizing anything, you need to measure it — guessing what\'s "slow" usually leads to wasted effort on the wrong part of the code.',
    mistake:'Optimizing code before measuring it is a classic trap — you can spend hours speeding up a function that was never the actual bottleneck.',
    tip:'performance.now() gives sub-millisecond precision, unlike Date.now() — that\'s why it\'s the standard for measuring code speed.',
    code:[
      ['k','const',' start = performance.', 'f','now','();'],
      ['f','runExpensiveTask','();'],
      ['f','console.log','(performance.', 'f','now','() - start);']
    ],
    notes:{
      0:'performance.now() returns a high-precision timestamp, ideal for measuring how long code takes to run.',
    },
    output:['42.7'],
    quiz:{ q:'Why measure with performance.now() instead of guessing which code is slow?', options:['Guessing is usually accurate enough','You need real data to know where time is actually being spent','It\'s required by JavaScript'], answer:1 },
  },
  internals:{
    title:'JS Engine Internals', level:'EXPERT', num:'18',
    description:'Explore execution contexts, memory and the event loop.',
    why:'Understanding the event loop explains "weird" JavaScript behavior you\'ll hit constantly — like why a setTimeout(fn, 0) still runs after the rest of your code, not immediately.',
    mistake:'Assuming setTimeout(fn, 0) runs instantly is a common misconception — it always waits for the current call stack and microtasks to clear first, no matter the delay.',
    tip:'Predict the print order before running: it\'s never top-to-bottom once timers and microtasks are involved.',
    code:[
      ['f','console.log','(', 's','"call stack"',');'],
      ['f','queueMicrotask','(() => ', 'f','console.log','(', 's','"microtask"',');)'],
      ['f','setTimeout','(() => ', 'f','console.log','(', 's','"task"',');, ', 'n','0',');']
    ],
    notes:{
      1:'Microtasks (like this one) always run before the next macrotask, even if both are "instant."',
      2:'setTimeout(fn, 0) doesn\'t run immediately — it queues fn to run after the current stack and all microtasks finish.',
    },
    output:['call stack','microtask','task'],
    quiz:{ q:'What order will these actually print in?', options:['call stack, microtask, task','call stack, task, microtask','task, microtask, call stack'], answer:0 },
  },
  userInputNode:{
    title:'Input in Node.js', level:'EXPERT', num:'19',
    description:'Prompt for input and read answers outside the browser, in a Node.js script.',
    why:'Command-line tools — setup wizards, scripts that ask "are you sure? (y/n)", CLI-based games — all need to pause and wait for typed input. This is how JavaScript does that outside a browser.',
    mistake:'Forgetting to close the readline interface (rl.close()) leaves the Node process hanging open, waiting forever instead of exiting when the script is done.',
    tip:'Node reads input asynchronously — the code inside rl.question() only runs once the user has actually pressed Enter.',
    code:[
      ['k','const',' readline = require(', 's','"readline"',');'],
      [],
      ['k','const',' rl = readline.', 'f','createInterface','({ input: process.stdin, output: process.stdout });'],
      [],
      ['plain','rl.', 'f','question','(', 's','"What is your name? "',', (name) => {'],
      ['f','  console.log','(', 's','`Hello, ${name}!`',');'],
      ['plain','  rl.', 'f','close','();'],
      ['plain','});']
    ],
    notes:{
      4:'rl.question() pauses the script and waits for the user to type something and press Enter, then runs the callback with their answer.',
      6:'rl.close() shuts down the input stream — without it, the Node process stays alive waiting for more input that never comes.',
    },
    output:['What is your name? Ama','Hello, Ama!'],
    quiz:{ q:'What happens if you forget rl.close()?', options:['The script throws an error','Nothing, it exits normally','The Node process stays running, waiting for more input'], answer:2 },
  },
  fileBlob:{
    title:'Reading Files (File API)', level:'EXPERT', num:'20',
    description:'Let users pick a file from their device and read its contents in the browser.',
    why:'Uploading a photo, importing a CSV, or letting someone drag a document into a web app all rely on the File and FileReader APIs — they\'re how a browser safely reads a file the user chose, without ever touching their filesystem directly.',
    mistake:'Trying to read reader.result before the FileReader has finished is a common mistake — reading is asynchronous, so the actual content is only available inside the onload callback.',
    tip:'Try logging file.type and file.size before reading it, to inspect a file before deciding whether to process it.',
    code:[
      ['k','const',' input = document.', 'f','querySelector','(', 's','"#fileInput"',');'],
      [],
      ['plain','input.', 'f','addEventListener','(', 's','"change"',', (event) => {'],
      ['k','  const',' file = event.target.files[', 'n','0','];'],
      ['k','  const',' reader = ', 'k','new',' FileReader();'],
      [],
      ['plain','  reader.onload = () => {'],
      ['f','    console.log','(', 's','`Contents: ${reader.result}`',');'],
      ['plain','  };'],
      [],
      ['plain','  reader.', 'f','readAsText','(file);'],
      ['plain','});']
    ],
    notes:{
      4:'FileReader reads file data asynchronously — it never blocks the page, even for a large file.',
      6:'onload only fires once the file has fully finished loading — this is where the actual file content becomes available.',
      10:'readAsText() starts the read process; readAsDataURL() is the version you\'d use for reading an image instead.',
    },
    output:['Contents: Hello from a text file!'],
    quiz:{ q:'Why is reader.result only accessed inside onload?', options:['Because reading a file happens asynchronously, and onload fires once it\'s done','Because result is a private property','It\'s not required, just a style convention'], answer:0 },
  },
  jsDatabase:{
    title:'Building a Mock Database', level:'EXPERT', num:'21',
    description:'Model a simple database with create, read, update, and delete (CRUD) operations using nothing but an array of objects.',
    why:'Every real backend, no matter how complex, boils down to the same four operations on data: create, read, update, delete (CRUD). Practicing this pattern in memory is exactly what you\'ll do later against a real database — just swapping the array for a database call.',
    mistake:'Using the array index as a permanent id is risky — if an item is deleted, every index after it shifts, silently breaking any code that stored the old index. Use a stable id field instead.',
    tip:'Try calling removeUser(1) and then addUser("Efua") — notice the id keeps incrementing even after a deletion, instead of reusing old ids.',
    code:[
      ['k','let',' users = [];'],
      ['k','let',' nextId = ', 'n','1',';'],
      [],
      ['c','// Create'],
      ['k','function',' addUser(name) {'],
      ['plain','  users.', 'f','push','({ id: nextId++, name });'],
      ['plain','}'],
      [],
      ['c','// Read'],
      ['k','function',' findUser(id) {'],
      ['k','  return',' users.', 'f','find','(u => u.id === id);'],
      ['plain','}'],
      [],
      ['c','// Update'],
      ['k','function',' renameUser(id, newName) {'],
      ['k','  const',' user = ', 'f','findUser','(id);'],
      ['k','  if',' (user) user.name = newName;'],
      ['plain','}'],
      [],
      ['c','// Delete'],
      ['k','function',' removeUser(id) {'],
      ['plain','  users = users.', 'f','filter','(u => u.id !== id);'],
      ['plain','}'],
      [],
      ['f','addUser','(', 's','"Kojo"',');'],
      ['f','addUser','(', 's','"Abena"',');'],
      ['f','renameUser','(', 'n','1',', ', 's','"Kojo Mensah"',');'],
      ['f','console.log','(users);']
    ],
    notes:{
      5:'nextId++ uses the current value of nextId as this user\'s id, then increases it — so every user gets a unique, permanent id.',
      10:'.find() returns the first matching item, or undefined if nothing matches — the same pattern a real database query uses.',
      16:'Checking "if (user)" first avoids a crash if someone passes an id that doesn\'t exist.',
      21:'.filter() rebuilds the array without the removed user — this is how "delete" works without a real database.',
    },
    output:['[ { id: 1, name: "Kojo Mensah" }, { id: 2, name: "Abena" } ]'],
    quiz:{ q:'Why use a separate "id" field instead of the array index to identify a user?', options:['id looks nicer in the console','Indexes shift when items are deleted, breaking references; id stays stable','Arrays don\'t support indexes'], answer:1 },
  }
}

const colors={k:'text-[#f18cc8]',s:'text-[#d9bb77]',n:'text-[#a7d58a]',b:'text-[#71b7ef]',c:'text-[#697586] italic',f:'text-[#63d2c4]',plain:'text-[#c6d0dc]'}

function CodeLine({line, i, hasNote, isOpen, onToggle}){
  if(!line.length) return <div className="h-6"><span className="inline-block w-10 text-right mr-5 text-[#3c4959] select-none">{i+1}</span></div>
  const out=[]; let cls='plain'; let key=0
  for(let x=0;x<line.length;x++){
    if(colors[line[x]] && x < line.length-1){ cls=line[x]; continue }
    out.push(<span key={key++} className={colors[cls]}>{line[x]}</span>)
  }
  return <div className="group/line flex items-start h-6 whitespace-pre rounded hover:bg-white/[0.03]">
    <span className="inline-block w-10 text-right mr-5 text-[#3c4959] select-none shrink-0">{i+1}</span>
    <span className="flex-1">{out}</span>
    {hasNote && <button
      onClick={()=>onToggle(i)}
      title="Why this line?"
      className={`ml-2 mr-2 shrink-0 w-4 h-4 rounded-full grid place-items-center text-[9px] font-bold border transition-opacity ${isOpen?'bg-[#42d7c1] text-[#061813] border-[#42d7c1] opacity-100':'text-[#5a6b7f] border-[#2a3648] opacity-0 group-hover/line:opacity-100 hover:text-[#42d7c1] hover:border-[#42d7c1]'}`}
    >?</button>}
  </div>
}

function App(){
  const [active,setActive]=useState('variables'); const [open,setOpen]=useState({beginner:true,intermediate:true,expert:true});
  const [tabs,setTabs]=useState(['variables','loops']); const [copied,setCopied]=useState(false); const [ran,setRan]=useState(false); const [sidebar,setSidebar]=useState(true)
  const [openNote,setOpenNote]=useState(null); const [quizPick,setQuizPick]=useState(null)
  const lesson=lessons[active]
  const selectLesson=(id)=>{setActive(id); if(!tabs.includes(id)) setTabs([...tabs,id]); setRan(false); setOpenNote(null); setQuizPick(null)}
  const closeTab=(e,id)=>{e.stopPropagation(); const next=tabs.filter(t=>t!==id); setTabs(next); if(active===id && next.length) setActive(next[next.length-1])}
  const copy=()=>{navigator.clipboard?.writeText(lesson.code.map(x=>x.filter(v=>!colors[v]).join('')).join('\n'));setCopied(true);setTimeout(()=>setCopied(false),1200)}
  const toggleNote=(i)=>setOpenNote(openNote===i?null:i)
  const outputLines = lesson.output || ['Hello from '+lesson.title+'!']
  return <div className="h-screen bg-[#080d15] text-[#cad3df] flex flex-col text-[13px]">
    <header className="h-12 shrink-0 border-b border-[#202a37] bg-[#0a1019] flex items-center px-3">
      <div className="flex items-center gap-2.5 w-64"><div className="relative w-7 h-7 rounded-lg bg-[#18bfa9] grid place-items-center shadow-[0_0_22px_#18bfa944]"><Bot size={17} className="text-[#061713]"/></div><span className="font-bold text-[15px] tracking-tight text-white">code<span className="text-[#35d6bd]">bot</span></span><span className="text-[9px] px-1.5 py-0.5 rounded bg-[#182331] text-[#8290a1] font-bold tracking-widest">ACADEMY</span></div>
      <div className="flex-1 flex justify-center"><div className="hidden md:flex items-center gap-2 w-[360px] h-7 rounded-md border border-[#253141] bg-[#101824] text-[#637184] px-3"><Search size={13}/><span className="flex-1">Search lessons...</span><span className="text-[10px] border border-[#344152] px-1 rounded">⌘ K</span></div></div>
      <div className="w-64 flex items-center justify-end gap-3"><div className="hidden sm:flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full bg-[#31d4ae]"></span><span className="text-[#7e8c9e]">4 day streak</span></div><button className="p-1.5 text-[#7f8c9d] hover:text-white"><Settings size={17}/></button><div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#885cf3] to-[#3ba5dc] grid place-items-center text-[10px] font-bold text-white">AJ</div></div>
    </header>
    <div className="flex min-h-0 flex-1">
      <nav className="w-12 shrink-0 border-r border-[#202a37] bg-[#090f18] py-3 flex flex-col items-center gap-2">
        {[Files,Search,GraduationCap,MessageSquareText].map((I,idx)=><button key={idx} className={`w-10 h-10 grid place-items-center relative ${idx===0?'text-[#42d7c1]':'text-[#657285] hover:text-[#aeb9c7]'}`}>{idx===0&&<span className="absolute left-0 w-0.5 h-6 bg-[#35d6bd] rounded-r"/>}<I size={19}/></button>)}
        <div className="mt-auto"><button className="w-10 h-10 grid place-items-center text-[#657285]"><CircleUserRound size={19}/></button></div>
      </nav>
      {sidebar&&<aside className="w-[270px] shrink-0 border-r border-[#202a37] bg-[#0b121c] flex flex-col min-h-0">
        <div className="h-10 px-4 flex items-center justify-between border-b border-[#1e2835]"><span className="text-[10px] font-bold tracking-[.16em] text-[#8693a4]">LEARNING PATH</span><MoreHorizontal size={15} className="text-[#677486]"/></div>
        <div className="px-4 pt-4 pb-3"><div className="rounded-lg bg-gradient-to-br from-[#122831] to-[#111d29] border border-[#1b3d43] p-3.5"><div className="flex justify-between items-center"><div><div className="text-[10px] text-[#58cfbe] font-semibold tracking-wider">YOUR PROGRESS</div><div className="text-white font-semibold mt-1">JavaScript Path</div></div><div className="w-10 h-10 rounded-full border-[3px] border-[#24cbb2] border-r-[#263746] grid place-items-center text-[10px] font-bold text-white">15%</div></div><div className="mt-3 h-1 rounded bg-[#24323d]"><div className="h-full w-[15%] rounded bg-[#29ccb4]"/></div></div></div>
        <div className="overflow-y-auto flex-1 pb-5">
          {curriculum.map(group=><div key={group.id} className="mb-1"><button onClick={()=>setOpen({...open,[group.id]:!open[group.id]})} className="w-full flex items-center px-4 py-2.5 gap-2 hover:bg-[#111a26]"><span className="w-2 h-2 rounded-full" style={{background:group.color}}/>{open[group.id]?<ChevronDown size={13}/>:<ChevronRight size={13}/>}<span className="font-bold tracking-[.12em] text-[10px]">{group.name}</span><span className="ml-auto text-[9px] text-[#546275]">{group.progress}%</span></button>
          {open[group.id]&&<div>{group.items.map(item=>{const I=item.icon; const is=active===item.id; return <button key={item.id} onClick={()=>selectLesson(item.id)} className={`w-full flex items-center gap-3 pl-8 pr-3 py-2.5 border-l-2 ${is?'bg-[#14252c] border-[#2bceb7] text-white':'border-transparent text-[#7d8a9c] hover:bg-[#101925] hover:text-[#b9c4d0]'}`}><I size={14} className={is?'text-[#42d4be]':''}/><span className="text-left flex-1 truncate">{item.title}</span>{item.done?<Check size={12} className="text-[#3ad0ad]"/>:<span className="text-[9px] text-[#4f5d6e]">{item.duration}</span>}</button>})}</div>}</div>)}
        </div>
      </aside>}
      <main className="min-w-0 flex-1 flex flex-col bg-[#0b111a]">
        <div className="h-10 bg-[#090f17] flex border-b border-[#202a37] overflow-x-auto">
          <button onClick={()=>setSidebar(!sidebar)} className="w-10 shrink-0 grid place-items-center border-r border-[#202a37] text-[#657285] hover:text-white"><PanelLeft size={15}/></button>
          {tabs.map(id=><button key={id} onClick={()=>setActive(id)} className={`group shrink-0 h-10 px-3 flex items-center gap-2 border-r border-[#202a37] border-t-2 ${active===id?'bg-[#0d151f] border-t-[#28cdb5] text-[#dbe3ed]':'bg-[#090f17] border-t-transparent text-[#657285]'}`}><FileCode2 size={13} className="text-[#e5c15b]"/><span>{lessons[id].title.replaceAll(' ','-').toLowerCase()}.js</span><X onClick={e=>closeTab(e,id)} size={12} className="ml-2 opacity-0 group-hover:opacity-100 hover:text-white"/></button>)}<div className="flex-1"/><button className="px-3 text-[#657285]"><Maximize2 size={14}/></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto code-scroll">
          <section className="max-w-[1050px] mx-auto px-6 md:px-10 py-8">
            <div className="flex items-start gap-4"><div className="hidden sm:grid w-11 h-11 rounded-xl bg-[#112c2c] border border-[#1d514b] place-items-center relative"><BookOpen size={20} className="text-[#3cd4bd]"/><span className="absolute inset-0 rounded-xl border border-[#32d5bd33] bot-glow"/></div><div className="flex-1"><div className="flex items-center gap-2 text-[10px] font-bold tracking-[.14em]"><span className="text-[#42d2bc]">{lesson.level}</span><ChevronRight size={11} className="text-[#4d5b6d]"/><span className="text-[#637184]">LESSON {lesson.num}</span></div><h1 className="text-2xl md:text-[28px] font-bold text-[#edf2f8] tracking-tight mt-1.5">{lesson.title}</h1><p className="text-[#778699] mt-2 text-sm">{lesson.description}</p></div><button className="hidden md:flex items-center gap-2 border border-[#263344] bg-[#111a25] hover:bg-[#172330] rounded-md px-3 py-2 text-[11px] text-[#9eabbc]"><BookOpen size={14}/> Lesson notes</button></div>

            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#243a2f] bg-[#0e1c17] p-3.5">
                <div className="flex gap-2 items-center text-[#5fd9a8] font-bold text-[10px] tracking-wider"><Lightbulb size={13}/> WHY THIS MATTERS</div>
                <p className="text-[#b9cdc4] text-[12px] leading-relaxed mt-1.5">{lesson.why}</p>
              </div>
              <div className="rounded-lg border border-[#3a2e24] bg-[#1c150e] p-3.5">
                <div className="flex gap-2 items-center text-[#e6a15c] font-bold text-[10px] tracking-wider"><AlertTriangle size={13}/> WATCH OUT FOR</div>
                <p className="text-[#cdbcab] text-[12px] leading-relaxed mt-1.5">{lesson.mistake}</p>
              </div>
            </div>

            <div className="mt-5 grid lg:grid-cols-[1fr_260px] gap-5">
              <div className="rounded-lg overflow-hidden border border-[#24303f] bg-[#090f17] shadow-[0_18px_60px_#00000025]">
                <div className="h-10 bg-[#101923] border-b border-[#24303f] flex items-center px-3"><div className="flex gap-1.5 mr-4"><span className="w-2.5 h-2.5 rounded-full bg-[#f06b65]"/><span className="w-2.5 h-2.5 rounded-full bg-[#e7b54c]"/><span className="w-2.5 h-2.5 rounded-full bg-[#42c47c]"/></div><FileCode2 size={13} className="text-[#e6c45c] mr-2"/><span className="text-[11px] text-[#8492a4]">example.js</span><span className="ml-3 hidden sm:flex items-center gap-1 text-[10px] text-[#4a5a6d]"><HelpCircle size={11}/> click a ? to see why</span><div className="ml-auto flex"><button onClick={copy} className="p-1.5 text-[#6e7c8d] hover:text-white" title="Copy"><Copy size={14}/></button><button className="p-1.5 text-[#6e7c8d]"><MoreHorizontal size={14}/></button></div></div>
                <div className="py-4 overflow-x-auto code-scroll font-mono text-[13px] leading-6 min-h-[350px]">
                  {lesson.code.map((line,i)=>{
                    const note = lesson.notes?.[i]
                    return <div key={i}>
                      <CodeLine line={line} i={i} hasNote={!!note} isOpen={openNote===i} onToggle={toggleNote}/>
                      {note && openNote===i && <div className="ml-10 mr-4 my-1 pl-3 pr-3 py-2 border-l-2 border-[#42d7c1] bg-[#0d1f1c] rounded-r text-[11px] text-[#a9d9d0] leading-relaxed">{note}</div>}
                    </div>
                  })}
                </div>
                <div className="border-t border-[#24303f] bg-[#0d151f] h-12 flex items-center px-3"><button onClick={()=>setRan(true)} className="h-8 flex items-center gap-2 rounded-md bg-[#25c9ae] hover:bg-[#3bd6bd] text-[#061813] px-4 text-[11px] font-bold"><Play size={13} fill="currentColor"/> RUN CODE</button><span className="ml-3 text-[10px] text-[#536174]">⌘ + Enter</span>{copied&&<span className="ml-auto text-[11px] text-[#3dd1b7] flex gap-1"><Check size={13}/> Copied</span>}</div>
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-[#24303f] bg-[#0e1721] overflow-hidden"><div className="px-3 h-10 border-b border-[#24303f] flex items-center gap-2 text-[10px] font-bold tracking-wider text-[#8290a2]"><TerminalSquare size={14}/> OUTPUT</div><div className="p-3 min-h-24 font-mono text-[11px]">{ran?<><div className="text-[#3dd1b7]">› Code executed successfully</div>{outputLines.map((line,idx)=><div key={idx} className="text-[#b8c3d0] mt-2">{line}</div>)}<div className="text-[#536174] mt-2">Process finished in 0.04s</div></>:<div className="text-[#4f5d6e]">Run your code to see the output here.</div>}</div></div>

                <div className="rounded-lg border border-[#443f27] bg-[#1a1a16] p-4"><div className="flex gap-2 items-center text-[#e6c569] font-bold text-[11px]"><Lightbulb size={15}/> CODEBOT TIP</div><p className="text-[#8e928d] text-[11px] leading-relaxed mt-2">{lesson.tip}</p><button className="mt-3 text-[#3ccdb7] text-[10px] font-bold hover:underline">ASK CODEBOT →</button></div>

                <div className="rounded-lg border border-[#24303f] bg-[#0e1721] p-4">
                  <div className="flex gap-2 items-center text-[#7dd3fc] font-bold text-[11px]"><HelpCircle size={15}/> QUICK CHECK</div>
                  <p className="text-[#c6d0dc] text-[12px] leading-relaxed mt-2">{lesson.quiz.q}</p>
                  <div className="mt-3 space-y-1.5">
                    {lesson.quiz.options.map((opt,idx)=>{
                      const isCorrect = idx===lesson.quiz.answer
                      const picked = quizPick===idx
                      const showResult = quizPick!==null
                      let style = 'border-[#263344] text-[#9eabbc] hover:bg-[#111a25] hover:text-white'
                      if(showResult && isCorrect) style='border-[#2bceb7] bg-[#0f2622] text-[#7ee8d1]'
                      else if(showResult && picked && !isCorrect) style='border-[#e2685f] bg-[#2a1414] text-[#f3a29c]'
                      return <button key={idx} onClick={()=>setQuizPick(idx)} className={`w-full text-left text-[11px] rounded-md px-3 py-2 border transition-colors ${style}`}>{opt}</button>
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between"><button className="text-[#667486] hover:text-white text-[11px]">← Previous lesson</button><button className="flex items-center gap-2 rounded-md border border-[#2c7e73] bg-[#102621] text-[#4bd5bf] px-4 py-2 text-[11px] font-semibold">Complete & continue <ChevronRight size={13}/></button></div>
          </section>
        </div>
        <footer className="h-6 shrink-0 bg-[#0e806f] text-[#d8fff8] flex items-center px-3 text-[10px]"><GitBranch size={11} className="mr-1"/> main <span className="ml-4">0 errors</span><span className="ml-3">0 warnings</span><span className="ml-auto">JavaScript</span><span className="ml-4">Spaces: 2</span><span className="ml-4">UTF-8</span></footer>
      </main>
    </div>
  </div>
}
export default App
