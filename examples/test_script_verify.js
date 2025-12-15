/**
 * Use this script to verify that your script include has been setup correctly.
 */
var testRecord = new GlideRecord(''); // <-- Put your table here!
testRecord.get(''); // <-- Put your sys_id here!

var flowSteps = new ProcessFlowUtils().getProcessFlowSteps(testRecord);
if (gs.nil(flowSteps)) {
 	gs.log('Found no flow steps...'); 
} else {
  gs.log('Flow Step fetching, found ' + flowSteps.getSize() + ' steps!');
  var flowStepJsons = [];
  for (var i = 0; i < flowSteps.getSize(); i++) {
      flowStepJsons.push({
          'label': flowSteps.getChoice(i).getLabel(),
          'state': flowSteps.getChoice(i).getParameter('state'),
          'rgb_triplet': flowSteps.getChoice(i).getParameter('rgb_triplet'),
      });
  }
  gs.print(JSON.stringify(flowStepJsons, null, 2));
}