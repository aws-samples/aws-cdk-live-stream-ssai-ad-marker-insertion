import datetime
import boto3
import json

def lambda_handler(event, context):
	print (json.dumps(event))
	offset = 20 #in seconds 
	channel = event["mediaLiveChannelId"] 
	event_id = 1001 #id of your choice
	duration = 900000 #duration of ad (10 sec* 90000 Hz ticks)
	medialive = boto3.client('medialive')

	now = datetime.datetime.utcnow()
	#print("Current UTS Time:", now)
	action = splice_insert(now, int(offset), int(event_id), int(duration))
	try:
		response = medialive.batch_update_schedule(ChannelId=channel, Creates={'ScheduleActions':[action]})
		print("medialive schedule response: ")
		print(json.dumps(response))
	except Exception as e:
		print("Error creating Schedule Action")
		print(e)
	return response

# start_time = when to insert our ad
# offset = added to start_time to determine actual time of ad marker insertion; 
#           if offset is too soon, actual time to insert marker may have already passed 
#           by the time MediaLive receives the scheduled action and will fail
# event_id = splice event ID as defined in SCTE-35
# duration = length of ad
def splice_insert(start_time, offset, event_id, duration):
	actual_start_time = start_time + datetime.timedelta(seconds=offset)
	actual_start_time_str = actual_start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
	action={
		'ActionName': 'splice_insert.{}'.format(actual_start_time_str), #actionName must be unique so we append the time string
		'ScheduleActionSettings': {
			'Scte35SpliceInsertSettings': {
				'SpliceEventId': event_id,
				'Duration': duration
			}
		},
		'ScheduleActionStartSettings': { 
			'FixedModeScheduleActionStartSettings': { 
				'Time': actual_start_time_str 
			}
		}    
	}
	return action