
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Queue;

public class NodeDescriptor {

	private long k, m;
	private Node node;
	private Map<Long, Queue<Node>> routingTable;

	public NodeDescriptor(long id, long m, long k) {
		node = new Node(id);
		this.k = k;
		this.m = m;
		routingTable = new LinkedHashMap<>();
	}

	public void updateRoutingTable(List<Node> list) {
		for(Node n : list) 
			updateRoutingTable(node);
	}
	
	public void updateRoutingTable(Node node) {
		long bucketId = findBucket(node.getId());
		Queue<Node> bucket = routingTable.get(bucketId);
		if (bucket.contains(node)) {
			// I move it to the end of the queue
			bucket.remove(node);
			bucket.add(node);
		} else {
			if(bucket.size() < k) 
				bucket.add(node);
			else {
				// I have to first ping the least recently seen node
				Node leastRecent = bucket.poll();
				if(leastRecent.ping()) 
					bucket.add(leastRecent);
				else
					bucket.add(node);
			}
		}	
	}
	
	public void startFindNode(long id, NodeDescriptor bootstrap) {
		Queue<Node> traveledNodes = new LinkedList<>();
		traveledNodes.add(this.node);
		List<Node> result = bootstrap.findNode(id, traveledNodes);
		updateRoutingTable(result);
	}
	
	public List<Node> findNode(long id, Queue<Node> traveledNodes) {
		for(Node n : traveledNodes)
			updateRoutingTable(n);
		traveledNodes.add(this.node);
		
		return null;
	}
	
	/*public List<Node> nodeLookup(long id) {
		
	}*/
	
	public List<Node> findBestEntries(long k, long id) {
		
		long found = 0;
		List<Node> list = new ArrayList<>();
		long bucketId = findBucket(id);
		Queue<Node> bucket = routingTable.get(bucketId);

		// I know less elements than k
		if(k > routingTable.size())
			k = routingTable.size();
		
		while(found < k) {
			if(bucket.size() + found <= k) {
				// I have at most the needed number of elements in the k-bucket
				// I can proceed adding all elements to the list
				found += bucket.size();
				list.addAll(bucket);
			} else {
				while(found < k) {
					Node next = bucket.peek();
					if(next != null) {
						list.add(next);
						found++;
					}
				}
			}
			
			//TODO CHANGE BUCKET
		}
		return list;
	}
	
	public long findBucket(long id) {
		long xorDistance = (long) (id ^ node.getId());
		return((long) (Math.log(xorDistance) / Math.log(2)));
		
	}

	public Node getNode() {
		return node;
	}

	public long getNodeId() {
		return node.getId();
	}


	public void joinNetwork(NodeDescriptor bootstrap) {
		Queue<Node> traveledNodes = new LinkedList<>();
		traveledNodes.add(this.node);
		List<Node> result = bootstrap.findNode(node.getId(), traveledNodes);
		updateRoutingTable(result);
		
	}
}
