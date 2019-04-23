
import java.util.Map; 
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Random;

/**
 * Class that models the coordinator. 
 * This entity is provided with a global view of the present nodes in the network
 * (they are stored in a Map) and is the entity that forces the join of the n nodes
 * 
 * @author Lorenzo Bellomo
 *
 */
public class Coordinator {
	
	/* Public and Static Fields */
	public static final int alpha = 3;

	/* Private Fields */
	private Map<BigInteger, NodeDescriptor> nodes;
	private Random rand;
	private long n, m, k;
	
	/* Stats fields */
	private int numberOfCollisions;
	private long millisElapsed;

	/* Constructors */
	
	/**
	 * Constructor of the coordinator. It gets in input the parameters of the P2P network
	 * @param n number of nodes join
	 * @param m number of bits in the identifier
	 * @param k number of entries per bucket in the routing table
	 */
	public Coordinator(long n, long m, long k) {
		rand = new Random();
		this.n = n;
		this.m = m;
		this.k = k;
		numberOfCollisions = 0;
		
	}
	
	/* Methods */

	/**
	 * This method corresponds to the first phase (phase 1, initialization) in the
	 * midTerm text. It generates a first node with an empty routing table
	 */
	private void initialize() {
		nodes = new HashMap<>((int) n);
		Node node = Utils.generateNewNode(m);
		System.out.println("Generating node number 1 out of " + n);
		NodeDescriptor first = new NodeDescriptor(node, m, k, this);
		nodes.put(first.getNodeId(), first);
	}
	
	/**
	 * This method generates a new node with identifier in the legal range 
	 * of allowed identifiers. It then chooses at random a bootstrap node between
	 * the ones already present in the network and simulates the join for
	 * given node with given bootstrap. After that, it tells the new node to issue a 
	 * given number of findNode operations targeting random IDs (one for every k-bucket 
	 * of his routing table) in order to populate some entries in the routing table 
	 * (and advertise the new node).
	 */
	private void generateNewNode() {
		// I generate a random id (different from the previous ones)

		Node node = Utils.generateNewNode(m);
		while (nodes.containsKey(node.getId())) {
			// I got a collision in the nodeId, I simply generate a new one
			numberOfCollisions++;
			node = Utils.generateNewNode(m);
		}
		
		// I find a random bootstrap node starting from the present ones
		long skip = (long) (rand.nextDouble() * nodes.size());
		NodeDescriptor bootstrap = nodes.values().stream().skip(skip).findFirst().get();
		
		// I now join newId with given bootstrap
		NodeDescriptor newNode = new NodeDescriptor(node, m, k, this);
		nodes.put(node.getId(), newNode);
		newNode.joinNetwork(bootstrap);
		for(int i = 0; i < m; i++) {
			//  I generate, for each i in [0, m), an id fitting k-bucket i
			BigInteger randomId = Utils.generateIDInRightBucket(i, newNode.getNodeId());
			// And I tell the new node to look for this random ID
			newNode.startFindNode(randomId);
		}	
	}
	
	/**
	 * This method simply makes the coordinator create the whole network, dump the
	 * network content to a csv file and display some stats about the network
	 */
	public void createNetwork() {
		
		// I compute the time needed to build the network
		long startTime = System.currentTimeMillis();
		
		initialize(); // This generates one node
		for (int i = 0; i < n - 1; i++) {
			System.out.println("Generating node number " + (i+2) + " out of " + n);
			generateNewNode();
		}
		// I have generated the total number of n nodes
		
		// I now have to dump the network content in the csv file		
		try (BufferedWriter writer = new BufferedWriter(new FileWriter("networkDump.csv"))) {
			for(NodeDescriptor n : nodes.values()) {
				try {
					n.dumpToFile(writer);
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		
		millisElapsed = System.currentTimeMillis() - startTime;
		// I now display some stats
		dumpStatistics();

	}
	
	/**
	 * Returns the NodeDescriptor associated the requested id, necessary to make the RPC calls
	 * (NodeDescriptor instance)
	 * @param targetId the id to be returned
	 * @return the RPC instance
	 */
	public NodeDescriptor askRPCInstance(BigInteger targetId) {
		return nodes.get(targetId);
	}
	
	/**
	 * This method simply displays the various statistics about the network as 
	 * collected during its lifetime
	 */
	private void dumpStatistics() {
		System.out.println("===========================================================================");
		// First thing I display is the number of collisions that happened
		System.out.println("Number of collisions with the hash function = " + numberOfCollisions);
		
		// I now compute both the total number of edges (stored it totEdges), and the recursive 
		// lookup depth reached. This means the number of times the lookup loop was executed
		long totEdges = 0;
		List<Long> recursiveDepths = new ArrayList<>();
		for(NodeDescriptor n : nodes.values()) {
			totEdges += n.exposeNumberOfEdges();
			recursiveDepths.addAll(n.exposeRecursiveDepth());
		}
		// I now compute the maximum number of depth reached by the lookup
		long maxDepth = recursiveDepths.stream()
				.max((l1, l2) -> l1.compareTo(l2))
				.get();
		System.out.println("Max depth reached is " + maxDepth);
		
		// What I now do is compute, for each depth reached, the number of times it was reached
		long arr [] = new long[(int) maxDepth];
		for(int i = 0; i < arr.length; i++)
			arr[i] = 0;
		for(Long l : recursiveDepths) 
			arr[l.intValue() - 1] = arr[l.intValue() - 1] + 1;
		
		System.out.println("Recursive depths reached:");
		for(int i = 0; i < arr.length; i++) 
			System.out.print((i + 1) + "->" + arr[i] + "  ");
		System.out.println();
		
		// I now compute the average of recursive depth reached
		double avg = recursiveDepths.stream()
			.mapToInt(e -> e.intValue())
			.average()
			.getAsDouble();
		System.out.println("Average recursive depth: " + Math.floor(avg * 100) / 100);
			
		System.out.println("Time needed to build the network " + ((double) millisElapsed / 1000) + " seconds");
		
		// What I'm going to do now is estimate the number of edges built in this way. 
		// I generate 20 identifiers and compute the distance from those nodes and all
		// the ones in the network. This way I can compute an average number of expected nodes per bucket
		double distances[] = new double[(int) m];
		for(int i = 0; i < distances.length; i++)
			distances[i] = 0;
		for(int i = 0; i < 20; i++) {
			Node n = Utils.generateNewNode(m);
			NodeDescriptor newND = new NodeDescriptor(n, m, k, this);
			for(NodeDescriptor nd : nodes.values()) {
				long index = newND.exposeBucketIndex(nd.getNodeId());
				distances[(int) index] +=1;
			}
		}
		for(int i = 0; i < distances.length; i++)
			distances[i] = (double) distances[i]/20;
		// At this point in distances[i] I have the expected number of nodes in bucket i
		
		// I now estimate the number of edges in a routing table according to the average 
		// distribution of nodes in all the buckets
		double betterEstimate = 0;
		for(int i = 0; i < m; i++) {
			double ithBucket = distances[i];
			if(ithBucket <= k)
				betterEstimate += ithBucket;
			else
				betterEstimate += k;
		}
		// I have now an average estimate for one routing table, I need it for n
		betterEstimate *= n;
		// At this point in betterEstimate I have a good estimation of the total number of edges
		
		// I now compute the theoretical max number of edges in the network (filled routing table)
		long maxTheoretical = 0;
		for(int i = 0; i < m; i++) {
			long pow = (long) Math.pow(2, i);
			if(Math.pow(2, i) < k)
				maxTheoretical += pow;	
			else 
				maxTheoretical += k;
		}
		maxTheoretical *= n;
		System.out.println("Theoretical maximum number of edges = " + maxTheoretical);
		System.out.println("Expected number of edges is around " + (long) betterEstimate);
		System.out.println("Number of total edges in the network = " + totEdges);
		
		// I now display, for each bucket, the average number of nodes falling into that bucket
		// for a generic node 		
		System.out.println("=========== Distances ===========");
		for(int i = 0; i < distances.length; i++) {
			System.out.print(i + "->" + (long) distances[i] + "   ");
			if(i % 5 == 0 && i != 0)
				System.out.println();
		}
		System.out.println();
		System.out.println("=========== End Distances ===========");
	}
	
}
