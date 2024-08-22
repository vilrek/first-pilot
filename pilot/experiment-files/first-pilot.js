/******************************************************************************/
/*** Preamble *****************************************************************/
/******************************************************************************/

/*
If doing read from csv, add info about this, e.g. mention what the structure of 
the csv is and what the structure of the read-in data is (i.e. when imported)

For pilot, as it is fairly manual with current approach, we are doing only 
one prompt per content type and two scenes (i.e. images) for now

TO DO:
- integrate with Prolific so get their Prolific ID? Or generate random ID/ask for
their participant id at the start of the experiment
- add code to save data trial by trial and check that it saves everything we need
    - prompt (i.e. linguistic stimuli)
    - target truth value
    - images filenames?
    - response option name of button (rather than just index)? Order is static atm
    so doesn't make a difference but may be good to have anyway
    - particpant id? If randomly generated, see conf.priming OELS
...

CODE WORDS to search through for to check if anything needs updating/fixing/checking:
UPDATE
CHECK
NOTE
FIX
REMOVE

*/

/******************************************************************************/
/*** Initialise jspsych *******************************************************/
/******************************************************************************/

var jsPsych = initJsPsych({
    // just to see that the ID is in the data
    on_finish: function () { jsPsych.data.displayData("csv"); } // REMOVE before piloting
});

/******************************************************************************/
/*** Maintaining a list of images to preload **********************************/
/******************************************************************************/

var images_to_preload = [];

// NOTE: ADD in the testing stims, as they will be shown to every ppt so 
// guaranteed they'll need to be preloaded

// NOTE: currently doing preloading as is done in conferedate_priming.js, but if
// we change to load stims from csv, this needs editing; see 
// conferedate_priming_readfromcsv.js to for how it was done there 

/******************************************************************************/
/*** Saving experiment data trial by trial ************************************/
/******************************************************************************/

/*
This is the save_data function provided in Alisdair's tutorial, section 06.
*/

function save_data(name, data_in) {
    var url = "save_data.php";
    var data_to_send = { filename: name, filedata: data_in };
    fetch(url, {
      method: "POST",
      body: JSON.stringify(data_to_send),
      headers: new Headers({
        "Content-Type": "application/json",
      }),
    });
  }

/*
This code will save data from critical trials line by line. 

Note that data is saved to a file named pragdep_ID.csv, where pragdep stands for 
Pragmatics of dependent measures and ID is the randomly-generated participant ID 
NOTE Last part will change if doing Prolific IDs!
*/
function save_pragdep_data_line(data) {
    // choose the data we want to save - this will also determine the order of the columns (so write_header should match this)
    var data_to_save = [
        participant_id,
        data.condition,
        data.response_format, // slider or radio buttons (this will also be clear from response, ofc)
        data.block, // CHECK that this is being saved correctly (new on 11 July)
        data.trial_index,
        data.target_truth_value,
        data.target_content_type,
        data.linguistic_prompt,
        data.target_image,
        ...data.images_in_order, // saves all images in the presented order (0-3). The ... is called spread, is applied within another 
        // array to make them into elements in the top level array (instead of a nested array). Ex: [...[1,2],3]=[1,2,3]. Avoids issue
        // with the quotation loop below, as would otherwise apply "" around the whole array images_in_order (and we want this array 
        // to be split for readability in the csv file later)
        data.response,
        data.time_elapsed,
        data.rt,
    ];

    // add quotation marks around each element that is saved to avoid splitting prompts that have commas
    for (i in data_to_save) {
        data_to_save[i] = "\"" + data_to_save[i] + "\"";
    }

    // join each element in the array with commas and add a new line
    var line = data_to_save.join(",") + "\n"; 
    var this_participant_filename = "pragdep/pragdep_" + participant_id + ".csv";
    save_data(this_participant_filename, line);
  }

/******************************************************************************/
/*** Saving survey data trial by trial ****************************************/
/******************************************************************************/

function save_survey_line(data) {
    // choose the data we want to save - this will also determine the order of the columns
    var survey_data = data.response;
    var data_to_save = [
      participant_id,
      survey_data.first_lang,
      survey_data.bilingual,
      survey_data.other_lang,
      survey_data.colourblind
    ];

    // add quotation marks around each element that is saved to avoid splitting prompts that have commas
    for (i in data_to_save) {
        data_to_save[i] = "\"" + data_to_save[i] + "\"";
    }

    // join these with commas and add a newline
    var line = data_to_save.join(",") + "\n";
    save_data("pragdep/surveys/pragdep_" + participant_id + "_survey.csv", line); 
  }  
  

  // code from Kenny
  /*function save_questionnaire_data(data) {
    //console logging these so you can see what the 
    //data generated by the survey trial looks like
    console.log(data);
    console.log(data.response);
    var questionnaire_data = data.response;
    var data_to_save = [
      questionnaire_data.age,
      questionnaire_data.n_speak_to,
      questionnaire_data.hours_speak_to
    ];
    //headers - gives the names of the 3 columns 
    var headers = "age,n_speak_to,hours_speak_to\n";
    // join these with commas and add a newline
    var line = headers + data_to_save.join(",") + "\n";
    save_data("perceptuallearning_questionnaire_data.csv", line);
  }*/
/******************************************************************************/
/*** Fetch the Prolific ID to use in data filename ****************************/
/******************************************************************************/

// just creating random ID for now
var participant_id = jsPsych.randomization.randomID(10);

// Will change to this to extract Prolific IDs: UPDATE before posting on Prolific
// var participant_id = jsPsych.data.getURLVariable("PROLIFIC_PID");

/******************************************************************************/
/*** Condition assignment (between ppts) **************************************/
/******************************************************************************/

// randomly select response format (radio buttons or slider) at start of experiment
var responseformat_assignment = jsPsych.randomization.sampleWithoutReplacement(
    ["radio", "slider"], 1)[0];
console.log(responseformat_assignment);

/*// store response format as a variable to use dynamically in the trial building function
if (responseformat_assignment == "radio") {
    plugin_type = jsPsychImageArrayMultiChoice; } 
  else { 
    plugin_type = jsPsychImageArraySliderResponse; }
  console.log(plugin_type); */

// pick a random condition + set plugin to depend on response format assignment for the training trial building function
// Note that if radio is chosen above, it only chooses between acceptability and truth 
// (not likelihood, as that's too unnatural and likely won't provide interesting data)
if (responseformat_assignment == "radio") { 
    var condition_assignment = 
        jsPsych.randomization.sampleWithoutReplacement(["truth", "acceptability"], 1)[0];
    // also when response format is radio, set plugin type to be radio button plugin (to be used dynamically in the trial building function)
    var plugin_type = jsPsychImageArrayMultiChoice;
} else {
    var condition_assignment = 
        jsPsych.randomization.sampleWithoutReplacement(["truth", "acceptability", "likelihood"], 1)[0];
    // and again, when response format is slider, set plugin to be slider plugin
    var plugin_type = jsPsychImageArraySliderResponse;
}
console.log(condition_assignment);

// Set the text and names for the response options and the instructions in a trial based on
// response format and condition assignment determined above (to pass to trial building function).
// if the response format is radio, set these values for each of the conditions:
// (note that likelihood is not included here as we are not doing binary likelihood trials) 
if (responseformat_assignment == "radio") { 
    if (condition_assignment == "truth") {
        response_options = [  
            {name: "truth", text: "True"}, 
            {name: "truth", text: "False"}
            ];
        instruction = "<p><em>For the highlighted card, is the following description true?</em></p>";
        } else {
        response_options = [  
            {name: "acceptability", text: "Acceptable"},
            {name: "acceptability", text: "Unacceptable"}
            ];
        instruction = "<p><em>For the highlighted card, is the following description acceptable?</em></p>";
        }
// or else, the response format is slider, and these values are chosen:
} else { 
    if (condition_assignment == "truth") {
        response_options = ["Completely false", "Completely true"];
        instruction = "<p><em>For the highlighted card, how true is the following description?</em></p>";
        } else if (condition_assignment == "acceptability") {
        response_options = ["Completely unacceptable", "Completely acceptable"];
        instruction = "<p><em>For the highlighted card, how acceptable is the following description?</em></p>";
        } else if (condition_assignment == "likelihood") {
        response_options = ["Completely impossible", "Completely certain"];
        instruction = "<p><em>One card is picked at random. How likely is the following description to be true?</em></p>";
        }
}
console.log(response_options);

// pretend the stim_list csv has been read in 
test_csv_stims = [
    { 
        content_type: "con", 
        prompt: "The square is orange and is left of the circle.", 
        prompt_name: "con", 
    },
    { 
        content_type: "arc", 
        prompt: "The circle, which is blue, is right of the triangle.", 
        prompt_name: "arc", 
    },
    { 
        content_type: "ana", 
        prompt: "The triangle is orange too.", 
        prompt_name: "ana", 
    },
    { 
        content_type: "def_ex", 
        prompt: "The blue circle is next to the triangle.", 
        prompt_name: "def_ex", 
    },
    { 
        content_type: "def_un", 
        prompt: "The circle is left of the triangle.", 
        prompt_name: "def_un", 
    },
    { 
        content_type: "only", 
        prompt: "Only the square is green.", 
        prompt_name: "only", 
    },
]

// create array with n repetitions of each of the 6 content types in random order - this will determine the order in which 
// the test trials will be built and thereby presented (i.e. the randomisation of trial order happens already here)
// This way can easily adjust number of total trials up or down (and keep an equal number of each content type)
var target_content_types = jsPsych.randomization.repeat(["con", "arc", "ana", "def_ex", "def_un", "only"], 2); // only doing 2 now while testing the save function
console.log(target_content_types);

/******************************************************************************/
/*** Creating training trials *************************************************/
/******************************************************************************/

/* Plan:
- make a trial, which will either be slider or radio depending on response format assignment
- and either likelihood, acceptability or truth depending on condition assignment
- in that trial, check the response on_finish
- if correct response: give correct feedback -> move on to testing trials
- if incorrect response: give incorrect feedback --> loop back to the same trial until they get it right
- have 3-4 training trials? Same regardless of condition and response format

- may need to have a separate stim list for training trials. As we need to have complete control of what is the correct an
incorrect answers - which we do for testing trials too, but for training we'll want some trials that are false, some true, and
some that are 50/50 to check that they pay attention. In the test, this can be completely random, but not in training.
- also because we are NOT using the same linguistic stimuli for training! So prompts will have to be different.
(this may also mean that the csv stim list for test can be moved back to appear right before test trial building function)

prob trials: extreme probabilities, but also one trial that is 50/50 (i.e. 2 clear true and 2 clear false)
---- note: this one will ofc only be slider

non-prob trials: one trial that is clearly appropriate and one that clearly isn't, and one in between
*/

// function to build a training trial
function make_training_trial(prompt, target, filler_1, filler_2, filler_3){
    
    // build image file paths
    var target_filename = "pilot_scenes/training_stims/" + target + ".jpg"; 
    var filler_1_filename = "pilot_scenes/training_stims/" + filler_1 + ".jpg";
    var filler_2_filename = "pilot_scenes/training_stims/" + filler_2 + ".jpg";
    var filler_3_filename = "pilot_scenes/training_stims/" + filler_3 + ".jpg";
    // NOTE Probably a neater way to do this, at least for filler images! Just no brain power to see it rn

    // put all the images together 
    var images_unshuffled = [].concat(target_filename, filler_1_filename, filler_2_filename, filler_3_filename); 
    console.log(images_unshuffled)
    images_to_preload.push(...images_unshuffled); // using spread to avoid preload list having a nested array; seems to work
    var images = jsPsych.randomization.shuffle(images_unshuffled);
    console.log(images)
    console.log(images.indexOf(target_filename)) // gets index of target image in the array of images

    // set the highlighted image index dependening on condition assignment 
    if (condition_assignment == "likelihood") {
        index = 4; // as images are 0-3, this makes there be no highlighted image for likelihood trials
    } else {
        index = images.indexOf(target_filename); // else the highlight is determined by the position of the target image
    }   

    // define what the correct answer is, which depends on response format and which of the three testing trials is running.
    // The latter will be determined by "target", which is input to the trial building function when calling it below
    if (responseformat_assignment == "radio") {
        if (target == "target-A") {
        correct_answer = ["True", "Acceptable"]; 
        } else if (target == "target-B") {
        correct_answer = ["True", "Acceptable"];
        } else if (target == "target-C") {
        correct_answer = ["False", "Unacceptable"]; 
        }
    } else if (responseformat_assignment == "slider") { 
        // note that we specify fairly generous ranges for what counts as correct in slider trials, although we'd expect 
        // very close to exact values for these (as listed)
        if (target == "target-A") {
        correct_answer = [80,81,82.83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100]; // expect 100 or close to
        } else if (target == "target-B") {
            correct_answer = [40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60]; // expect 50 or close to
        } else if (target == "target-C") {
            correct_answer = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]; // expect 0 or close to 
        }
        // NOTE This is not an elegant solution for specifying the range, but only reasonable alternative I found was to create
        // a function to define a range which ends up being more lines of code anyway so for now keeping as this (although higher
        // risk of typos with this method so may want to change!)
    };
    console.log(correct_answer);
    var correct_answer = correct_answer; // seems I have to store this for the trial variable below to be able to access it. 
    // Can't tell why, as e.g. "index" seems to be accesible even when it's not stored in a variable..!

    // a subtrial that builds the training trial
    var training_trial = {
        type: plugin_type,
        images: images,
        preamble: "<br>" + instruction, // adding white space above to avoid it jumping around if "incorrect" is shown after
        prompt: prompt, // currently going with specifying this in function input
        labels: response_options, // currently not working correctly for sliders - although might work when putting into main?
        // think it may be because slider plugin has the parameter called "labels", and radio plugin has "options"!
        // yep, that's right! So either have type not be dynamic and build this function like test trial, or change name of parameter
        // in radio plugin (if possible)
        // NOTE Pro type not dynamic: can set slider width. Con: Code for training block will be v long and repetitive..
        highlighted_image_index: index, // this will depend on target, like in test (only relevant for non-prob trials)

        //at the start of the trial, make a note of all relevant info to be saved
        on_start: function (trial) { // NOTE: in main exp, the text in brackets matches name of the variable ("training_trial")
            // but want to test whether that is necessary or can just have it sat "trial" as Maisy has had it
            // UPDATE Seems to work!
            trial.data = { // same here, this before said "training_trial.data" UPDATE seems to work
                condition: condition_assignment,
                response_format: responseformat_assignment,
                block: "training", 
                target_truth_value: "na", 
                target_content_type: "na", 
                linguistic_prompt: prompt, 
                target_image: target_filename,
                images_in_order: images, // saves the filenames in the order they were presented in a trial, i.e. the shuffled order
                // NOTE Not really necessary for training block, but might as well save it I guess?
            };
        },
        on_finish: function (data) {
            // save to data property whether response was correct (=true) or incorrect (=false)
            // if(data.response === correct_answer){data.correct = true} // old method of checking when only one element in correct_answer
            // New method: check if response is included in the correct_answer array - set data.correct as "true" if it is
            if(correct_answer.includes(data.response)){data.correct = true} 
            // NOTE: === is identity (i.e. will check for match and type), == is only looking for equality (so will check for match 
            // but not in type; e.g. the following will all return true: 1 == '1', 1 == 1, 1 == true)
            else {data.correct = false}
            console.log(correct_answer); // this is where the issue lies! But don't know why.. UPDATE: stored the variable and now
            // it works. Guess it wasn't accessible in the same way the others were, though don't know why! E.g. index works fine
            // without being stored as a variable...
            console.log(data.response); // ISSUE is that response is stored as e.g. "truth", i.e. the same as condition. CHECK if that
            // is also what happens in the main exp! UPDATE Have fixed that, now it stores the actual text of the button (note; is
            // case-sensitive!)
            console.log(data.correct); // evalutes correctly! 
            save_pragdep_data_line(data); //save the trial data 
        },
    };
        console.log(training_trial);
        console.log(response_options);

    // a subtrial that appears if the participant chooses the wrong response
    var incorrect_feedback = {
        type: plugin_type,
        images: images,
        preamble: "<b style=color:red>Incorrect! Try again.</b><br>" + instruction, 
        prompt: prompt,
        labels: response_options, 
        highlighted_image_index: index, 

        on_start: function (trial) { 
            trial.data = {
                condition: condition_assignment,
                response_format: responseformat_assignment,
                block: "training",
                target_truth_value: "na", 
                target_content_type: "na", 
                linguistic_prompt: prompt, 
                target_image: target_filename,
                images_in_order: images, 
            };
        },
        on_finish: function (data) {
            // save to data property whether response was correct (=true) or incorrect (=false)
            //if(data.response === correct_answer){data.correct = true} // old way of checking when only one element in correct_answer
            if(correct_answer.includes(data.response)){data.correct = true}  
            else {data.correct = false}
            console.log(correct_answer); 
            console.log(data.response); 
            console.log(data.correct);
            save_pragdep_data_line(data); //save the trial data 
            console.log(images);
        },
    };

    // a conditional node that tells to only show incorrect feedback if the most recent trial was answered incorrectly
    var conditional_node = {
        timeline: [incorrect_feedback],
        conditional_function: function () {
            var last_trial_correct = jsPsych.data.get().last(1).values()[0].correct // gets what data.correct was stored as 
            console.log(last_trial_correct);
            if(last_trial_correct == false) { // if response in most recent trial was stored as false, i.e. incorrect, then
                return true; // means we *will* run the incorrect_feedback timeline
            } else {
                return false; // means we will not
            } 
        }
    };

    // a loop that says to show incorrect feedback every time the participant chooses the wrong answer
    var retry_loop = {
        timeline: [conditional_node],
        loop_function: function () { // NOTE Removed "data" from brackets (Maisy had that) but seems to work anyway!
            var last_trial_correct = jsPsych.data.get().last(1).values()[0].correct
            if(last_trial_correct == false) { 
                return true; // means we *will* run the conditional_node timeline
            } else {
                return false; // means we will not 
            } 
        },
    };

    // set the feedback that will be displayed when a participant chooses the correct response, 
    // to be used in the correct_feedback subtrial below
    if (condition_assignment == "truth") { 
        if (responseformat_assignment == "radio") {
            if (target == "target-A") {
                correct_response = "true.</p>";
            } else if (target == "target-B") {
                correct_response = "true.</p>";
            } else if (target == "target-C") {
                correct_response = "false.</p>";
            }
        } else if (responseformat_assignment == "slider") {
            if (target == "target-A") {
                correct_response = "completely true.</p>";
            } else if (target == "target-B") {
                correct_response = "completely true.</p>";
            } else if (target == "target-C") {
                correct_response = "completely false.</p>";
            }
        }
    } else if (condition_assignment == "acceptability") {
        if (responseformat_assignment == "radio") {
            if (target == "target-A") {
                correct_response = "acceptable.</p>";
            } else if (target == "target-B") {
                correct_response = "acceptable.</p>";
            } else if (target == "target-C") {
                correct_response = "unacceptable.</p>";
            }
        } else if (responseformat_assignment == "slider") {
            if (target == "target-A") {
                correct_response = "completely acceptable.</p>";
            } else if (target == "target-B") {
                correct_response = "completely acceptable.</p>";
            } else if (target == "target-C") {
                correct_response = "completely unacceptable.</p>";
            }
        }
    // or else, the condition assignment is likelihood (which is always slider), meaning this is the feedback:
    } else if (condition_assignment == "likelihood") {
        if (target == "target-A") {
            correct_response = "the sentence is completely true.</p>";
        } else if (target == "target-B") {
            correct_response = "there is an even chance that the sentence is true.</p>";
        } else if (target == "target-C") {
            correct_response = "the sentence is completely false.</p>";
        }
    }
    console.log(correct_response);
    var correct_response = correct_response; // again, seems like it needed to be stored in a variable to be properly accessible

    // a subtrial that appears if the participant chooses the correct response
    // NOTE this currently doesn't store any of the data - CHECK if we need that (don't see why we would, only relevant
    // thing to keep track of I'd guess is how many attempts a participant needs)
    var correct_feedback = { // works, but need some finetuning for how we store correct_answer for slider trials (see lines 175-185)
        type: jsPsychHtmlButtonResponse, 
        stimulus: function () {
        // if the trial was a likelihood trial, show all four images in feedback
        //var answer = jsPsych.data.get().last(1).values()[0].response; // store response from most recent trial (i.e. the correct one)
        // NOTE used the above line of code for showing the answer in feedback, but looks funny with slider trials so have to modify this if we want to use it
        if (condition_assignment == "likelihood") {
            return prompt + "<p><b style=color:forestgreen>Correct! Here, if a card is picked at random </br>" + correct_response +
            // The answer is \"" + answer + "\".<p>" + 
            "<img src=" + images[0] + " style='border:3px solid lightgray; width:200px'>" + "&nbsp; &nbsp;" +
            "<img src=" + images[1] + " style='border:3px solid lightgray; width:200px'>" +
            "</br>" + // need to get this horizontal space to match the width of the vertical one! But CHECK w Dan whether we need to
            // show the images again at all before spending more time on this
            "<img src=" + images[2] + " style='border:3px solid lightgray; width:200px'>" + "&nbsp; &nbsp;" + 
            "<img src=" + images[3] + " style='border:3px solid lightgray; width:200px'>";
        }
        // otherwise, show only the target image 
        else {
            return prompt + "<p><b style=color:forestgreen>Correct! For the highlighted card, </br>the sentence is " + correct_response + 
            "<img src=" + target_filename + " style='border:3px solid lightgray; width:200px'>";
        }
        },
        choices: ['Continue'],
    };

    // this ties together all of the subtrials and hence is the final output of the training trial building function:
    var full_training_trial = { timeline: [training_trial, retry_loop, correct_feedback] }; 

  return full_training_trial;
}

// call the function to build the 3 training trials and store in a variable to be run in the final timeline
var training_trials = [
    make_training_trial("The triangle is blue.", "target-A", "filler-A1", "filler-A2", "filler-A3"),
    make_training_trial("The square that is next to the triangle is green.", "target-B", "filler-B1", "filler-B2", "filler-B3"),
    make_training_trial("The circle is blue and is right of the triangle.", "target-C", "filler-C1", "filler-C2", "filler-C3")
  ];

/******************************************************************************/
/*** Creating testing trials **************************************************/
/******************************************************************************/

/* Steps:
NOTE: ADD LIST HERE to explain what the code does (short summary), or have this in the preamble
*/

/*
CURRENT METHOD (15 Apr): since we want 5 of each content type and 30 trials in total, we first make an array of the 6 content 
types and repeat 5 times with shuffling. Then we create the trial building function, then loop through the content types array 
to input each of those content types in turn and thereby build the individual trials. Since the content types array is shuffled 
when created, we don't need to randomise the order of the trials when the loop is finished, we can simply send that list 
of trials to the timeline as is. 

The trial building function chooses the set of images to be used in any one trial to be of the same content type. This is so
that we have control of the truth value for each of the filler images (relevant for probability trials) and not just the target
image, as it means that the image names for fillers will indeed be correct for that combination of content type and prompt (it 
also means that there is a decent chance some of the images will be the same in any given trial). 

Note: at current there is only one prompt per content type, so may need to make some edits if adding more later. Note also that
the current approach for fillers where they are chosen from the pool of images that have the same content type as
the target, in practice means that it is chosing from all images with that content type at since there are only 4 images per 
content type + prompt at the moment. However, the code is written so that it can choose from a larger pool, if we decide to add
more images per contcontent type + prompt combination later.
*/

// function to create the trials
function make_trial(target_content_type) {
    // make array with all possible truth value combinations
    var truth_values = ["tt","tf","ft","ff"];
    // randomly select one of them to be the target truth value in a trial
    var target_truth_value = 
    jsPsych.randomization.sampleWithoutReplacement(truth_values, 1);
    console.log(target_truth_value);
    // NOTE May need to use on_finish here to access the selected truth value later, when specifying data to save 

    // set trial stims to be determined by what is input as the target content type when trial building function
    // is called below 
    // so this returns everything in the stim list (the pretend csv) that matches the current target content type
    var trial_stims_pool = test_csv_stims.filter(function(row) {return row.content_type == target_content_type;});
    console.log(trial_stims_pool);
    
    // out of this pool of stims that all have the target content type for that trial, randomly choose 4 with 
    // replacement to populate the trial
    // NOTE At current (12 June), there are 8 images associated with each prompt (note: prompt is identical to content
    // type at current, since there is only one prompt for each content type): 2 images * 4 possible truth status combinations
    var trial_stims = jsPsych.randomization.sampleWithReplacement(trial_stims_pool, 4); 
    console.log(trial_stims);
    
    // of these, pick first element to be the target (relevant for non-probability trials, makes no difference for rest)
    var target_stim = trial_stims[0]; 

    // build target scene/image filename
    var target_prompt_name = target_stim.prompt_name;
    // MAY REMOVE THIS variable assignment --- UNLESS it's needed for saving that data on finish
    console.log(target_prompt_name);

    // NOTE: since there are two possible (uniquely named) scenes that can satisfy a 
    // given truth value and prompt combination, the image filename is set to
    // randomly pick a number 1-2 for the scene index and include that in the filename
    // 1+(Math.floor(Math.random() * 2));
    // Explanation: start with 1, add generated random number between 0 (inclusive) and 1 (exclusive), 
    // multiply by 2, round up to whole number
    // NOTE: CHECK this explanation is correct! In the old exp file
    var target_image_filename = "pilot_scenes/".concat(target_prompt_name,"-",target_truth_value,"-",1+(Math.floor(Math.random() * 2)),".jpg");
    console.log(target_image_filename);
    // NOTE target_prompt_name could just be target_stim.prompt_name, if no need to store in a variable (see above)

    // add filename to the list of images to preload
    images_to_preload.push(target_image_filename);
    
    // build filler scenes filenames from the remaining stims in trial stims (i.e. that have the same content type as target)
    var filler_image_filenames = []
    for (var i=1; i<4; i++) { 
        filler_stim = trial_stims[i];
        filler_image_filename = "pilot_scenes/".concat(
            filler_stim.prompt_name,
            "-",
            jsPsych.randomization.sampleWithoutReplacement(truth_values, 1), // randomly samples truth value 
            "-",
            1+(Math.floor(Math.random() * 2)), // randomly selects scene index (1 or 2)
            ".jpg"
        ); 
        // IDEA if need to store filler image truth values, may be able to log it here? Can use console log and store in an object, or 
        // do the randomisation and store in an object before putting together the filename
        filler_image_filenames.push(filler_image_filename);
        // also add to list of images to preload
        images_to_preload.push(filler_image_filename);
    }
    console.log(filler_image_filenames)

    // put all the scenes together 
    var selected_scenes_unshuffled = [].concat(target_image_filename, filler_image_filenames);
    console.log(selected_scenes_unshuffled)
    // shuffle the selected scenes before passing to the trial plugin 
    var selected_scenes = jsPsych.randomization.shuffle(selected_scenes_unshuffled);
    console.log(selected_scenes)
    console.log(selected_scenes.indexOf(target_image_filename)) // gets index of target image in the array of selected scenes

    // set the highlighted image index and preamble dependening on condition assignment 
    if (condition_assignment == "likelihood") {
        index = 4; // as images are 0-3, this makes there be no highlighted image for likelihood trials
    } else {
        index = selected_scenes.indexOf(target_image_filename); // else the highlight is determined by the position of the target image
    } 
 
    // put trial together using either the custom radio button plugin or the custom slider plugin, dependent on response format assignment
    // NOTE It seems that type can be dynamic now, so can change this to be dynamic in the way it's done for the training trials if we want
    // to. Keeping as is for now as that really is only cosmetic and the code works as is.
    if (responseformat_assignment== "radio") {
        // make trials using custom radio button plugin
        var trial = {
            type: jsPsychImageArrayMultiChoice,
            images: selected_scenes, 
            preamble: instruction, 
            prompt: target_stim.prompt,
            labels: response_options,
            highlighted_image_index: index,

            //at the start of the trial, make a note of all relevant info to be saved
            on_start: function (trial) {
                trial.data = {
                    condition: condition_assignment,
                    response_format: "radio",
                    block: "test",
                    target_truth_value: target_truth_value, // seems to work even when name is the same for both
                    target_content_type: target_content_type, // seems to work even when name is the same for both
                    linguistic_prompt: target_stim.prompt, 
                    target_image: target_image_filename,
                    //filler_images_truth_values: currently this info is only in the filename, so not sure how best to access this! 
                    //could be done from the csv in data processing, although tidiest if it's already saved in csv perhaps?
                    images_in_order: selected_scenes, // saves the filenames in the order they were presented in a trial, i.e. the shuffled order
                };
            },
            on_finish: function (data) {
                save_pragdep_data_line(data); //save the trial data
            },
        };
        return trial;
    } else { 
        // else make trials using custom slider plugin
        var slider_trial = {
            type: jsPsychImageArraySliderResponse,
            images: selected_scenes,
            preamble: instruction,
            prompt: target_stim.prompt,
            labels: response_options,
            highlighted_image_index: index,
           // slider_width: // can set this in pixels

            //at the start of the trial, make a note of all relevant info to be saved
            on_start: function (slider_trial) {
                slider_trial.data = {
                    condition: condition_assignment,
                    response_format: "slider",
                    block: "test",
                    target_truth_value: target_truth_value, // seems to work even when name is the same for both
                    target_content_type: target_content_type, // seems to work even when name is the same for both
                    linguistic_prompt: target_stim.prompt, 
                    target_image: target_image_filename,
                    //filler_images_truth_values: currently this info is only in the filename, so not sure how best to access this! 
                    //could be done from the csv in data processing, although tidiest if it's already saved in csv perhaps?
                    images_in_order: selected_scenes, // saves the filenames in the order they were presented in a trial, i.e. the shuffled order
                };
            },
            on_finish: function (data) {
                save_pragdep_data_line(data); //save the trial data
            },
        };
        console.log(slider_trial);
        return slider_trial;
    } 
}

// build the trials according to the array of content types made at start of experiment.
// As this array was randomly shuffled, the randomisation has already happened so this 
// code only loops through that array and pushes each trial into test_trials, which then
// goes in the timeline at the end 
var test_trials = []
for (target_content_type of target_content_types) {
        single_trial = make_trial(target_content_type);
        test_trials.push(single_trial);
}
console.log(test_trials);

// just for having a reference point to check all trials are being shown as expected - REMOVE LATER
var next_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: 'Im the next trial!',
    choices: ["Correct answer", "Wrong answer"]
}

/******************************************************************************/
/*** Preload ******************************************************************/
/******************************************************************************/

console.log(images_to_preload);

var preload = {
    type: jsPsychPreload,
    auto_preload: true,
    images: images_to_preload,
};

console.log(preload);

/******************************************************************************/
/*** Write headers for experiment data file ****************************************/
/******************************************************************************/

var write_headers = {
    type: jsPsychCallFunction,
    func: function () {
      var this_participant_filename = "pragdep/pragdep_" + participant_id + ".csv"; // NOTE May CHANGE participant_id if doing the prolific thing
      //write column headers to pragdep_pilot_data.csv, with quotes around to match code saving line by line 
      save_data(
        this_participant_filename,
        "\"participant_id\",\
        \"condition\",\
        \"response_format\",\
        \"block\",\
        \"trial_index\",\
        \"target_truth_value\",\
        \"target_content_type\",\
        \"linguistic_prompt\",\
        \"target_image\",\
        \"images_in_presentation_order_0\",\
        \"images_in_presentation_order_1\",\
        \"images_in_presentation_order_2\",\
        \"images_in_presentation_order_3\",\
        \"response\",\
        \"time_elapsed\",\
        \"rt\"\n" 
      );
    },
  };

/******************************************************************************/
/*** Write headers for survey data file ***************************************/
/******************************************************************************/

var write_survey_headers = { 
    type: jsPsychCallFunction,
    func: function () {
      var this_participant_filename = "pragdep/surveys/pragdep_" + participant_id + "_survey.csv"; // NOTE May CHANGE participant_id if doing the prolific thing
      //write column headers to pragdep_pilot_data.csv, with quotes around to match code saving line by line 
      save_data(
        this_participant_filename,
        "\"participant_id\",\
        \"first_lang\",\
        \"bilingual\",\
        \"other_lang\",\
        \"colourblind\"\n" 
      );
    },
  };

/******************************************************************************/
/*** Instruction trials *******************************************************/
/******************************************************************************/

var consent_screen = {
    type: jsPsychHtmlButtonResponse,
    stimulus:
        "<h3>Welcome to the experiment</h3> \
    <p style='text-align:left'>Experiments begin with an information sheet that explains to the participant \
    what they will be doing, how their data will be used, and how they will be \
    remunerated.</p> \
    <p style='text-align:left'>This is a placeholder for that information.</p>",
    choices: ["Yes, I consent"],
};
// This text needs to be updated! Will be whatever consent form we have ethics for, I assume CHECK NOTE

// Instructions will depend on condition assignment, so made the stimulus parameter dynamic by using a function
// that checks what the condition assignment is and returns the corresponding instructions
var instructions = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function(){
        if (condition_assignment == "likelihood") {
            return "<h3>Instructions for experiment</h3> \
            <p style='text-align:left'>In each question, you will see a set of 4 cards and a sentence describing the cards.</p> \
            <p style='text-align:left'> Your task is to indicate how likely the sentence is to be true for the 4 cards.<br> \
            We'll start with three practice questions.  \
            <p style='text-align:left'>When you feel ready, click Continue below to start the practice section.</p>";
        } else if (condition_assignment == "truth") {
            return "<h3>Instructions for experiment</h3> \
            <p style='text-align:left'>In each question, you will see a set of 4 cards and a sentence describing the cards.</p> \
            <p style='text-align:left'> One of the cards will be highlighted with a red dashed line. Your task is to indicate whether \
            the sentence is true for <u>the highlighted card</u> only.<br> \
            We'll start with three practice questions. \
            <p style='text-align:left'>When you feel ready, click Continue below to start the practice section.</p>";
        } else if (condition_assignment == "acceptability") {
            return "<h3>Instructions for experiment</h3> \
            <p style='text-align:left'>In each question, you will see a set of 4 cards and a sentence describing the cards.</p> \
            <p style='text-align:left'> One of the cards will be highlighted with a red dashed line. Your task is to indicate whether \
            the sentence is acceptable for <u>the highlighted card</u> only.<br> \
            We'll start with three practice questions. \
            <p style='text-align:left'>When you feel ready, click Continue below to start the practice section.</p>";
        }
    }, 
    choices: ["Continue"],
};

var exp_start = {
    type: jsPsychHtmlButtonResponse,
    stimulus:
      "<h3>Start of the experiment</h3> \
    <p style='text-align:left'>That is the practice part done. Next we will start the real experiment.<br> \
    In some of the following questions the response might not be obvious.<br> \
    Just respond with your first intuition and don't overthink it. </p> \
    <p style='text-align:left'>When you feel ready to start, click Continue below.</p>",
    choices: ["Continue"],    
}
var final_screen = {
    type: jsPsychHtmlButtonResponse,
    stimulus:
      "<h3>Finished!</h3> \
    <p style='text-align:left'>Thank you for taking part!</p> \
    <p style='text-align:left'>Click Finish to complete the experiment and return to Prolific.</p>",
    choices: ["Finish"],
};

/******************************************************************************/
/*** Feedback and demographics ******************************************************/
/******************************************************************************/

var feedback = {
    type: jsPsychSurveyText,
    preamble: "<p style='text-align:left'> <b>Feedback</b></p>",
    questions: [
      {prompt: 'Do you have any comments about this experiment?', rows: 5, name: 'feedback'}
    ]
  }

var demographics_survey = {
    type: jsPsychSurveyHtmlForm,
    preamble:
      "<p style='text-align:left'> <b>Demographics survey</b></p>\
                <p style='text-align:left'> Finally, we would like to \
                gather some background information about you. This will not be \
                associated with any information that might identify you and will not \
                impact your pay for participating in this study.</p>", 
    html: "<p style='text-align:left'>What is your first language?<br> \
                <input required name='first_lang' type='text'></p> \
            <p style='text-align:left'>Was any other language spoken \
             in the home before the age of 6?<br>\
                <input required name='bilingual' type='radio'><label>Yes</label> \
                <input required name='bilingual' type='radio'><label>No</label></p> \
            <p style='text-align:left'>If you responded yes above, \
           which language(s)?<br>\
              <input name='other_lang' type='text'></p> \
            <p style='text-align:left'>Do you experience colourblidness?<br> \
                <input required name='colourblind' type='radio'><label>Yes</label> \
                <input required name='colourblind' type='radio'><label>No</label></p>",
    //at the start of the trial, make a note of all relevant info to be saved
    /*on_start: function (trial) {
        trial.data = { // find out how to extract the relevant info! 
            first_lang: first_lang,
            bilingual: bilingual,
            other_lang: other_lang,
            colourblind: colourblind,
        };
    },*/
    on_finish: function (data) {
        save_survey_line(data); //save the survey data
    },
  };

// might want to add a check of if "Yes" to bilingual, require final question
// Also, may need to make it save the radio buttons in a different way, currently the 
// data just says "On" which is not helpful - CHECK THIS

/******************************************************************************/
/*** Build the full timeline **************************************************/
/******************************************************************************/

var full_timeline = [].concat(
   // consent_screen,
    instructions,
    write_headers,
    write_survey_headers,
    preload,
    training_trials,
    exp_start, 
    test_trials,
    next_trial,
    feedback,
    demographics_survey,
    final_screen
);

/******************************************************************************/
/*** Run the timeline *********************************************************/
/******************************************************************************/

// this will change if reading from csv, see confederate_priming_readfromcsv.js
// but currently using this method 

jsPsych.run(full_timeline);