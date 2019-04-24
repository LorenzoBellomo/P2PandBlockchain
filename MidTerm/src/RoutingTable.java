
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.stream.Collectors;

/**
 * This class models a routing table of m buckets, each one of size k. 
 * It provides a number of methods for updating it
 * @author Lorenzo Bellomo
 *
 */
public class RoutingTable {
	
	/* Private fields*/

	private long k;
	private BigInteger nodeId;
	private int m;
	private List<Queue<Node>> routingTable;
	private long numberOfEdges;

	/**
	 * Constructor, builds a routing table, built of m buckets of size at most k
	 * @param m the number of bits of the id
	 * @param k the number of entries per bucket
	 * @param nodeId the id creating the routing table
	 */
	public RoutingTable(long m, long k, BigInteger nodeId) {
		this.m = (int) m;
		this.k = k;
		this.nodeId = nodeId;
		routingTable = new ArrayList<>(this.m);
		for (long i = 0; i < m; i++)
			routingTable.add(new LinkedList<>());
		numberOfEdges = 0;
	}

	/**
	 * It updates the routing table of this node from a single node. This method
	 * respects the "least recently seen" algorithm for updating entries in the
	 * routing table (even if the ping method is just a mock one representing a
	 * "churn-free" network)
	 * 
	 * @param node the single node to potentially add to the routing table
	 */
	public void tryAddNode(Node node) {

		Queue<Node> bucket = findBucket(node.getId());
		if (bucket.contains(node)) {
			// I move it to the end of the queue
			bucket.remove(node);
			bucket.add(node);
		} else {
			if (bucket.size() < k) {
				bucket.add(node);
				numberOfEdges++;
			} else {
				// I have to first ping the least recently seen node
				Node leastRecent = bucket.poll();
				if (leastRecent.ping()) // Then I put it back at the end of the queue
					bucket.add(leastRecent);
				else // I add the new element
					bucket.add(node);
			}
		}
	}

	/**
	 * Given an id, it returns the bucket in the routing table of given id
	 * 
	 * @param id the id whose bucket must be found
	 * @return the id of the bucket (in the range [0, m))
	 */
	public long findBucketIndex(BigInteger id) {
		BigInteger xorDistance = this.nodeId.xor(id);
		// I have now to check that I don't do log(0)
		long result = (xorDistance.getLowestSetBit() == -1)? 0 : ((long) (Math.log(xorDistance.doubleValue()) / Math.log(2)));
		return result;

	} 

	/**
	 * Similar to findBucketIndex, but actually returns the bucket
	 * 
	 * @param id the id whose bucket must be found
	 * @return the bucket of this id, null if not initialized
	 */
	private Queue<Node> findBucket(BigInteger id) {
		long bucketId = findBucketIndex(id);
		return routingTable.get((int) bucketId);

	}

	/**
	 * This method finds the best x entries in the routing table, where x is passed
	 * as a parameter. If the node knows less than x nodes, it just returns the
	 * whole set of known nodes
	 * 
	 * @param x  the number of entries to return
	 * @param id the target id from which to minimize the distance
	 * @return the list of best entries in the routing table
	 */
	public List<Node> findBestEntries(long x, BigInteger id) {

		List<Node> bestX;
		Queue<Node> bucket = findBucket(id);
	
		bestX = new ArrayList<>();
		bestX.addAll(bucket);
		// I might have found already x elements, or the bucket might not have enough elements
		if(bestX.size() < x) {
			// I need to visit the routing table, by visiting first the bucket
			// before the first one (the best k-bucket), then the one after that,
			// by following a pattern like -1, +1, -2, +2, -3, +3... until I either
			// find x elements, or get back to the first bucket
			int firstBucketIndex = (int) findBucketIndex(id);
			int prev = firstBucketIndex;
			int step = -1;
			while(bestX.size() < x) {
				// I find next bucket modulo m
				int nextBucket = (firstBucketIndex + step) % m;
				if(nextBucket < 0) // Sometimes modulo returns a negative num.
					nextBucket += m;
				if (nextBucket == prev) // It means I didn't find x elem
					break;
				prev = nextBucket;
				bucket = routingTable.get(nextBucket);
				bestX.addAll(bucket);
				// This part is the -1, +1, -2, +2... cycle
				step = -1 * step;
				if(step < 0)
					step--;
			}
		}
		
		// At this point I return the list sorted by distance 
		bestX = bestX.stream()
			.sorted((n1, n2) -> (n1.getId().xor(id).compareTo(n2.getId().xor(id))))
			.limit(x)
			.collect(Collectors.toList());

		return bestX;
	}

	/**
	 * This method returns a string in this format:
	 * for each edge (x, y) -> "x,y\n"
	 * This string is the one that is written to the csv file
	 * @return
	 */
	public String getCSVDump() {
		StringBuilder builder = new StringBuilder();
		routingTable.stream()
			.flatMap(q -> q.stream())
			.forEach(e -> builder.append(this.nodeId + "," + e.getId() + System.lineSeparator()));
		
		return builder.toString();
	}
	
	/** 
	 * Returns the number of edges in the routing table
	 * @return the number of outgoing edges in the routing table
	 */
	public long getNumberOfEdges() {
		return numberOfEdges;
	}
	
	/**
	 * This method adds to the inDegree map 1 if I have an outgoing edge towards it, 
	 * or 0 if I don't
	 * @param map the inDegree map
	 */
	public void addInDegrees(Map<BigInteger, Long> map) {
		routingTable.stream()
			.flatMap(e -> e.stream())
			.forEach(e -> map.put(e.getId(), map.get(e.getId()) + 1));
	}

}
